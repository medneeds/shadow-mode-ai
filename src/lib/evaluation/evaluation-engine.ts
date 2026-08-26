/**
 * Phase 06 — Evaluation Engine (determinístico, sem LLM).
 *
 * Contrato:
 * - Entrada: definição do caso + runtime concluído + sessão de treino.
 * - Saída: SessionEvaluation reprodutível. Mesmo caso + mesmas ações + mesmos
 *   tempos ⇒ mesma pontuação, independentemente de voz/texto, perfil do
 *   treinador, preferência de voz ou velocidade de fala.
 * - Nenhum LLM participa do cálculo. Nada é inferido do desfecho clínico:
 *   avaliamos comportamento registrado.
 */
import { formatClinicalClock } from "@/lib/clinical/clinical-case-engine";
import type {
  ActionStatus,
  ClinicalCaseDefinition,
  ClinicalCaseRuntime,
  ExpectedAction,
  PatientStatePatch,
} from "@/lib/clinical/clinical-case-types";
import type { TrainingSession } from "@/lib/training-session";
import { bandForScore, bandLabel } from "./score-bands";
import {
  categoryToDomain,
  domainLabels,
  type CategoryEvaluation,
  type CriticalOmission,
  type EvaluationDomain,
  type ExpectedActionEvaluation,
  type ExpectedActionOutcome,
  type SessionEvaluation,
  type TimelineEntry,
  type TranscriptEntry,
  type UnsafeActionFinding,
} from "./evaluation-types";

const statusRank: Record<ActionStatus, number> = {
  not_performed: 0,
  not_applicable: 0,
  requested: 1,
  performed: 2,
  completed: 3,
};

const outcomeLabels: Record<ExpectedActionOutcome, string> = {
  completed_in_window: "realizada na janela esperada",
  completed_late: "realizada com atraso relevante",
  incomplete: "solicitada, porém não concluída",
  not_performed: "não realizada",
  not_applicable: "tentada sem pré-requisito e sem efeito",
};

const outcomeDescriptions: Record<string, string> = {
  in_progress: "Estação encerrada com o caso ainda em condução",
  stabilized: "Paciente estabilizado ao final da estação",
  deteriorated: "Paciente deteriorado ao final da estação",
  arrested: "Paciente em parada cardiorrespiratória ao final da estação",
};

function domainOf(expected: ExpectedAction): EvaluationDomain {
  return expected.domain ?? categoryToDomain[expected.category];
}

function labelOf(def: ClinicalCaseDefinition, actionId: string): string {
  return def.actions.find((a) => a.id === actionId)?.label ?? actionId;
}

/** Verifica de forma determinística se uma tag estava presente em um segundo. */
function tagPresentAt(
  def: ClinicalCaseDefinition,
  runtime: ClinicalCaseRuntime,
  tag: string,
  second: number,
): boolean {
  let present = def.initialState.tags.includes(tag);

  const changes: { at: number; adds: boolean; removes: boolean }[] = [];
  const push = (at: number, patch?: PatientStatePatch) => {
    if (!patch) return;
    const adds = patch.addTags?.includes(tag) ?? false;
    const removes = patch.removeTags?.includes(tag) ?? false;
    if (adds || removes) changes.push({ at, adds, removes });
  };

  for (const logged of runtime.actionLog) {
    if (logged.status === "not_applicable") continue;
    push(logged.clinicalTime, def.actions.find((a) => a.id === logged.actionId)?.statePatch);
  }
  for (const triggerId of runtime.firedTriggerIds) {
    const trigger = def.timeTriggers.find((t) => t.id === triggerId);
    if (trigger) push(trigger.atClinicalSecond, trigger.statePatch);
  }

  for (const change of changes.sort((a, b) => a.at - b.at)) {
    if (change.at > second) break;
    if (change.removes) present = false;
    if (change.adds) present = true;
  }
  return present;
}

/* ------------------------------------------------- ações esperadas -------- */

function evaluateExpectedAction(
  def: ClinicalCaseDefinition,
  runtime: ClinicalCaseRuntime,
  expected: ExpectedAction,
): ExpectedActionEvaluation {
  const label = labelOf(def, expected.actionId);
  const domain = domainOf(expected);
  // Equivalência clínica: qualquer ação do grupo satisfaz a mesma expectativa.
  const acceptedIds = [expected.actionId, ...(expected.equivalentActionIds ?? [])];
  const entries = runtime.actionLog.filter((a) => acceptedIds.includes(a.actionId));
  const effective = entries.find((a) => statusRank[a.status] > 0);
  const status: ActionStatus = effective?.status ?? (entries.length > 0 ? "not_applicable" : "not_performed");

  const required = statusRank[expected.completionStatus];
  const achieved = statusRank[status];

  let outcome: ExpectedActionOutcome;
  let factor: number;

  if (achieved === 0) {
    outcome = entries.length > 0 ? "not_applicable" : "not_performed";
    factor = 0;
  } else if (achieved < required) {
    outcome = "incomplete";
    factor = def.scoring.incompleteCreditFactor;
  } else {
    const late =
      expected.recommendedWindowSeconds !== undefined &&
      (effective?.clinicalTime ?? 0) > expected.recommendedWindowSeconds;
    outcome = late ? "completed_late" : "completed_in_window";
    factor = late ? def.scoring.lateCreditFactor : 1;
  }

  const earned = Math.round(expected.scoreWeight * factor * 100) / 100;

  const windowText =
    expected.recommendedWindowSeconds !== undefined
      ? ` Janela esperada: até ${formatClinicalClock(expected.recommendedWindowSeconds)}.`
      : "";
  const timeText =
    effective !== undefined ? ` Registrada em ${formatClinicalClock(effective.clinicalTime)}.` : "";

  const evaluation: ExpectedActionEvaluation = {
    actionId: expected.actionId,
    label,
    domain,
    importance: expected.importance,
    critical: expected.critical,
    outcome,
    status,
    weight: expected.scoreWeight,
    earned,
    rationale: `${label}: ${outcomeLabels[outcome]}.${timeText}${windowText}`,
  };
  if (effective) evaluation.performedAtSecond = effective.clinicalTime;
  if (expected.recommendedWindowSeconds !== undefined)
    evaluation.recommendedWindowSeconds = expected.recommendedWindowSeconds;
  if (expected.learningPoint) evaluation.learningPoint = expected.learningPoint;
  return evaluation;
}

/* ------------------------------------------------------- ações inseguras -- */

function findUnsafeActions(
  def: ClinicalCaseDefinition,
  runtime: ClinicalCaseRuntime,
): UnsafeActionFinding[] {
  const findings: UnsafeActionFinding[] = [];
  for (const rule of def.scoring.unsafeActions ?? []) {
    for (const logged of runtime.actionLog) {
      if (logged.actionId !== rule.actionId) continue;
      if (logged.status === "not_applicable") continue;
      if (rule.onlyWithTag && !tagPresentAt(def, runtime, rule.onlyWithTag, logged.clinicalTime))
        continue;
      findings.push({
        actionId: rule.actionId,
        description: rule.description,
        domain: rule.domain,
        penaltyPoints: rule.penaltyPoints,
        atClinicalSecond: logged.clinicalTime,
      });
      break; // ações redundantes não são penalizadas repetidamente
    }
  }
  return findings;
}

/* -------------------------------------------------- omissões críticas ----- */

function findCriticalOmissions(
  def: ClinicalCaseDefinition,
  runtime: ClinicalCaseRuntime,
  actions: ExpectedActionEvaluation[],
): CriticalOmission[] {
  const omissions: CriticalOmission[] = [];
  for (const expected of def.expectedActions) {
    if (!expected.critical) continue;
    const result = actions.find((a) => a.actionId === expected.actionId);
    if (!result) continue;
    if (result.outcome === "completed_in_window") continue;

    const rule = expected.omission;
    const description =
      rule?.description ??
      `${result.label}: ação crítica ${outcomeLabels[result.outcome]}.`;
    const triggerFired =
      rule?.consequenceTriggerId !== undefined &&
      runtime.firedTriggerIds.includes(rule.consequenceTriggerId);

    const omission: CriticalOmission = {
      actionId: expected.actionId,
      description,
      occurred: true,
    };
    if (expected.recommendedWindowSeconds !== undefined)
      omission.expectedWindowSeconds = expected.recommendedWindowSeconds;
    // A consequência só aparece se o evento realmente ocorreu na estação.
    if (triggerFired && rule?.consequence) omission.consequence = rule.consequence;
    omissions.push(omission);
  }
  return omissions;
}

/* ------------------------------------------------------------ domínios ---- */

function buildCategories(
  def: ClinicalCaseDefinition,
  actions: ExpectedActionEvaluation[],
  omissions: CriticalOmission[],
  unsafe: UnsafeActionFinding[],
): CategoryEvaluation[] {
  const domains = def.scoring.domains;
  const categories: CategoryEvaluation[] = [];

  for (const domain of domains) {
    const items = actions.filter((a) => a.domain === domain);
    const unsafeHere = unsafe.filter((u) => u.domain === domain);
    if (items.length === 0 && unsafeHere.length === 0) continue;

    const maxScore = items.reduce((sum, a) => sum + a.weight, 0);
    const rawScore = items.reduce((sum, a) => sum + a.earned, 0);
    const penalty = unsafeHere.reduce((sum, u) => sum + u.penaltyPoints, 0);
    const score = Math.max(0, Math.round((rawScore - penalty) * 100) / 100);

    const criticalIssues = [
      ...omissions
        .filter((o) => items.some((a) => a.actionId === o.actionId && a.critical))
        .map((o) => o.description),
      ...unsafeHere.map((u) => u.description),
    ];

    categories.push({
      category: domain,
      label: domainLabels[domain],
      score: Math.round(score),
      maxScore: Math.round(maxScore),
      percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
      performedItems: items
        .filter((a) => a.outcome === "completed_in_window" || a.outcome === "completed_late")
        .map((a) => a.label),
      missedItems: items
        .filter((a) => a.outcome === "not_performed" || a.outcome === "incomplete" || a.outcome === "not_applicable")
        .map((a) => a.label),
      criticalIssues,
    });
  }

  return categories;
}

/* ----------------------------------------------------------- headline ----- */

function buildHeadline(score: number, categories: CategoryEvaluation[], criticalCount: number): string {
  const band = bandForScore(score);
  const base: Record<string, string> = {
    excelente: "Condução consistente e segura do caso",
    muito_bom: "Boa condução do caso",
    bom: "Condução adequada, com perdas em pontos relevantes",
    em_desenvolvimento: "Condução incompleta em pontos importantes",
    precisa_revisao: "Condução com falhas estruturais na abordagem",
  };
  const weakest = [...categories]
    .filter((c) => c.maxScore > 0)
    .sort((a, b) => a.percentage - b.percentage)[0];

  const tail =
    criticalCount > 0
      ? `${criticalCount === 1 ? "1 ponto crítico" : `${criticalCount} pontos críticos`} identificado${criticalCount === 1 ? "" : "s"}.`
      : weakest && weakest.percentage < 100
        ? `Maior oportunidade em ${weakest.label.toLowerCase()}.`
        : "Sem falhas relevantes registradas.";

  return `${base[band]}. ${tail}`;
}

/* ------------------------------------------------------- linha do tempo --- */

export function buildTimeline(
  def: ClinicalCaseDefinition,
  runtime: ClinicalCaseRuntime,
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  for (const logged of runtime.actionLog) {
    if (logged.status === "not_applicable") continue;
    entries.push({
      atClinicalSecond: logged.clinicalTime,
      clock: formatClinicalClock(logged.clinicalTime),
      kind: "trainee_action",
      text: logged.label,
    });
  }

  for (const event of runtime.events) {
    const kind: TimelineEntry["kind"] =
      event.source === "investigation_result"
        ? "investigation_result"
        : event.source === "state_transition"
          ? "state_change"
          : "clinical_event";
    entries.push({
      atClinicalSecond: event.atClinicalSecond,
      clock: formatClinicalClock(event.atClinicalSecond),
      kind,
      text: event.fact,
    });
  }

  void def;
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) =>
      a.entry.atClinicalSecond === b.entry.atClinicalSecond
        ? a.index - b.index
        : a.entry.atClinicalSecond - b.entry.atClinicalSecond,
    )
    .map((item) => item.entry);
}

/* --------------------------------------------------------- transcrição ---- */

export function buildTranscript(
  def: ClinicalCaseDefinition,
  session: TrainingSession,
): TranscriptEntry[] {
  return session.traineeInputs.map((input) => ({
    atClinicalSecond: input.clinicalTime,
    clock: formatClinicalClock(input.clinicalTime),
    source: input.source,
    rawContent: input.rawContent,
    understoodActions: (input.interpretation?.actions ?? []).map((a) => labelOf(def, a.actionId)),
  }));
}

/* ------------------------------------------------------- evaluateSession -- */

export function evaluateSession(
  def: ClinicalCaseDefinition,
  runtime: ClinicalCaseRuntime,
  session: TrainingSession,
): SessionEvaluation {
  // A sessão não influencia o cálculo: modalidade, voz e perfil são neutros.
  void session;
  const actions = def.expectedActions.map((expected) =>
    evaluateExpectedAction(def, runtime, expected),
  );
  const unsafeActions = findUnsafeActions(def, runtime);
  const criticalOmissions = findCriticalOmissions(def, runtime, actions);
  const categories = buildCategories(def, actions, criticalOmissions, unsafeActions);

  const totalMax = actions.reduce((sum, a) => sum + a.weight, 0);
  const totalEarned = Math.round(actions.reduce((sum, a) => sum + a.earned, 0) * 100) / 100;
  const penaltyPoints = unsafeActions.reduce((sum, u) => sum + u.penaltyPoints, 0);

  const rawScore = totalMax > 0 ? (totalEarned / totalMax) * 100 : 0;
  const overallScore = Math.max(0, Math.min(100, Math.round(rawScore - penaltyPoints)));
  const band = bandForScore(overallScore);

  const strengths = actions
    .filter((a) => a.outcome === "completed_in_window" && a.weight >= 6)
    .map((a) => {
      const relevance = def.expectedActions.find((e) => e.actionId === a.actionId)?.clinicalRelevance;
      return relevance ? `${a.label} dentro da janela esperada. ${relevance}` : `${a.label} dentro da janela esperada.`;
    });

  const misses = actions
    .filter((a) => a.outcome !== "completed_in_window")
    .sort((a, b) => b.weight - a.weight)
    .map((a) => {
      const relevance = def.expectedActions.find((e) => e.actionId === a.actionId)?.clinicalRelevance;
      return relevance ? `${a.rationale} ${relevance}` : a.rationale;
    });

  const criticalIssues = [
    ...criticalOmissions.map((o) =>
      o.consequence ? `${o.description} ${o.consequence}` : o.description,
    ),
    ...unsafeActions.map((u) => u.description),
  ];

  const improvements = Array.from(
    new Set(
      actions
        .filter((a) => a.outcome !== "completed_in_window")
        .sort((a, b) => b.weight - a.weight)
        .map((a) => a.learningPoint)
        .filter((point): point is string => Boolean(point)),
    ),
  ).slice(0, 4);

  return {
    caseId: def.id,
    caseVersion: def.scoring.caseVersion,
    scoringVersion: def.scoring.scoringVersion,
    overallScore,
    band,
    bandLabel: bandLabel(band),
    headline: buildHeadline(overallScore, categories, criticalIssues.length),
    totalEarned,
    totalMax,
    penaltyPoints,
    categories,
    actions,
    strengths,
    misses,
    criticalIssues,
    criticalOmissions,
    unsafeActions,
    improvements:
      improvements.length > 0
        ? improvements
        : ["Mantenha a sequência de avaliação, tratamento e reavaliação em casos de maior complexidade."],
    expectedManagement: def.scoring.expectedManagement,
    outcome: outcomeDescriptions[runtime.outcome] ?? runtime.outcome,
    clinicalSecondsElapsed: runtime.elapsedClinicalSeconds,
  };
}
