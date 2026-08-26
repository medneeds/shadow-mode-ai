/**
 * Phase 06.7 — Validação determinística de definições de caso.
 *
 * Um caso inválido não pode entrar em produção. A validação cobre:
 * metadados obrigatórios (Zod), integridade referencial (ações, investigações,
 * gatilhos, ramos) e sanidade da rubrica (pesos, janelas, domínios).
 */
import { z } from "zod";

import type { ClinicalCaseDefinition } from "./clinical-case-types";
import { caseArchetypes, clinicalSettings } from "./case-taxonomy";

const metaSchema = z.object({
  specialty: z.string().min(2),
  topic: z.string().min(2),
  subtopic: z.string().min(2).optional(),
  archetype: z.enum(caseArchetypes),
  setting: z.enum(clinicalSettings),
  difficulty: z.enum(["basico", "intermediario", "avancado"]),
  clinicalSyndrome: z.string().min(3),
  primaryDiagnosis: z.string().min(3),
  dangerousDifferentials: z.array(z.string().min(2)).min(1),
  ageGroup: z.enum(["pediatric", "adult", "elderly"]),
  acuity: z.enum(["critical", "urgent", "semi_urgent"]),
  skills: z.array(z.string()).min(2),
  compatibleDurations: z.array(z.string()).min(1),
  estimatedMinutes: z.number().int().positive(),
  review: z.object({
    status: z.enum(["draft", "needs_clinical_review", "reviewed"]),
    reviewedAt: z.string().optional(),
    reviewVersion: z.string().optional(),
    notes: z.string().optional(),
  }),
  keywords: z.array(z.string().min(2)).min(3),
});

export type CaseValidationIssue = { caseId: string; code: string; message: string };

export type CaseValidationReport = {
  caseId: string;
  ok: boolean;
  issues: CaseValidationIssue[];
};

export function validateCase(def: ClinicalCaseDefinition): CaseValidationReport {
  const issues: CaseValidationIssue[] = [];
  const add = (code: string, message: string) => issues.push({ caseId: def.id, code, message });

  const meta = metaSchema.safeParse(def.meta);
  if (!meta.success) {
    for (const issue of meta.error.issues) {
      add("meta_invalid", `meta.${issue.path.join(".")}: ${issue.message}`);
    }
  }

  if (!def.scoring.caseVersion) add("missing_version", "scoring.caseVersion ausente.");
  if (!def.scoring.scoringVersion) add("missing_version", "scoring.scoringVersion ausente.");
  if (def.opening.trim().length < 20) add("weak_opening", "Abertura muito curta para uma estação.");

  const actionIds = new Set(def.actions.map((a) => a.id));
  const invIds = new Set(def.investigations.map((i) => i.id));

  if (def.actions.length !== actionIds.size) add("duplicate_action", "Ids de ação duplicados.");
  if (def.investigations.length !== invIds.size)
    add("duplicate_investigation", "Ids de investigação duplicados.");

  /* ------------------------------------------------------------ ações --- */
  for (const a of def.actions) {
    if (a.requestsInvestigationId && !invIds.has(a.requestsInvestigationId))
      add("unknown_investigation", `Ação ${a.id} solicita investigação inexistente.`);
    for (const p of a.prerequisites ?? [])
      if (!actionIds.has(p)) add("unknown_action", `Pré-requisito desconhecido em ${a.id}: ${p}.`);
    for (const d of a.disclosesInformationIds ?? [])
      if (!def.patient.information.some((i) => i.id === d))
        add("unknown_information", `Ação ${a.id} libera informação inexistente: ${d}.`);
    if (a.statePatch && a.patchRequiresTag && !a.ineffectiveFact)
      add(
        "missing_ineffective_fact",
        `Ação condicional ${a.id} não define resposta para quando o efeito não se aplica.`,
      );
  }

  /* -------------------------------------------------- investigações ----- */
  for (const inv of def.investigations) {
    if (!inv.result.trim()) add("investigation_no_result", `Investigação ${inv.id} sem resultado.`);
    if (inv.availabilityDelaySeconds < 0)
      add("invalid_delay", `Investigação ${inv.id} com atraso negativo.`);
    for (const p of inv.prerequisites ?? [])
      if (!actionIds.has(p))
        add("unknown_action", `Investigação ${inv.id} exige ação inexistente: ${p}.`);
    if (!def.actions.some((a) => a.requestsInvestigationId === inv.id))
      add("unreachable_investigation", `Nenhuma ação solicita a investigação ${inv.id}.`);
  }

  /* ------------------------------------------------- informação/exame --- */
  for (const i of def.patient.information) {
    const rule = i.availability;
    if (rule.kind === "requires_action" && !actionIds.has(rule.actionId))
      add("unknown_action", `Informação ${i.id} depende de ação inexistente: ${rule.actionId}.`);
    if (rule.kind === "requires_investigation" && !invIds.has(rule.investigationId))
      add("unknown_investigation", `Informação ${i.id} depende de investigação inexistente.`);
  }
  for (const f of def.examFindings) {
    if (!actionIds.has(f.requiredAction))
      add("unknown_action", `Achado ${f.id} exige ação inexistente: ${f.requiredAction}.`);
  }

  /* ------------------------------------------------------- gatilhos ----- */
  const triggerIds = new Set<string>();
  for (const t of def.timeTriggers) {
    if (triggerIds.has(t.id)) add("duplicate_trigger", `Gatilho duplicado: ${t.id}.`);
    triggerIds.add(t.id);
    if (t.atClinicalSecond <= 0) add("invalid_trigger_time", `Gatilho ${t.id} com tempo inválido.`);
    if (!t.fact.trim()) add("trigger_no_fact", `Gatilho ${t.id} sem fato clínico.`);
    for (const c of t.conditions) {
      const ids =
        c.kind === "action_missing" || c.kind === "action_performed"
          ? [c.actionId]
          : c.kind === "all_actions_missing" || c.kind === "any_action_performed"
            ? c.actionIds
            : [];
      for (const id of ids)
        if (!actionIds.has(id))
          add("unknown_action", `Gatilho ${t.id} referencia ação inexistente: ${id}.`);
    }
    if (t.branchId && !(def.branches ?? []).some((b) => b.id === t.branchId))
      add("unknown_branch", `Gatilho ${t.id} aponta para ramo inexistente: ${t.branchId}.`);
  }

  /* --------------------------------------------------------- rubrica ---- */
  let totalWeight = 0;
  for (const e of def.expectedActions) {
    totalWeight += e.scoreWeight;
    if (!actionIds.has(e.actionId))
      add("unknown_action", `Ação esperada inexistente no catálogo: ${e.actionId}.`);
    for (const alt of e.equivalentActionIds ?? [])
      if (!actionIds.has(alt))
        add("unknown_action", `Ação equivalente inexistente: ${alt} (em ${e.actionId}).`);
    if (e.scoreWeight <= 0) add("invalid_weight", `Peso inválido em ${e.actionId}.`);
    if (e.critical && e.recommendedWindowSeconds === undefined)
      add("missing_window", `Ação crítica ${e.actionId} sem janela clínica.`);
    if (
      e.recommendedWindowSeconds !== undefined &&
      (e.recommendedWindowSeconds <= 0 ||
        e.recommendedWindowSeconds > def.completion.maxClinicalSeconds)
    )
      add("invalid_window", `Janela inválida em ${e.actionId}.`);
    if (e.omission?.consequenceTriggerId && !triggerIds.has(e.omission.consequenceTriggerId))
      add("unknown_trigger", `Omissão de ${e.actionId} referencia gatilho inexistente.`);
    if (e.objectiveId && !(def.objectives ?? []).some((o) => o.id === e.objectiveId))
      add("unknown_objective", `Ação ${e.actionId} referencia objetivo inexistente.`);
  }
  if (def.expectedActions.length === 0) add("no_expected_actions", "Caso sem ações esperadas.");
  if (totalWeight <= 0) add("invalid_weight", "Soma dos pesos inválida.");
  if (!def.expectedActions.some((e) => e.critical))
    add("no_critical_action", "Caso sem nenhuma ação crítica definida.");

  for (const rule of def.scoring.unsafeActions ?? []) {
    if (!actionIds.has(rule.actionId))
      add("unknown_action", `Ação insegura inexistente: ${rule.actionId}.`);
    if (rule.penaltyPoints <= 0 || rule.penaltyPoints > 100)
      add("invalid_penalty", `Penalidade inválida em ${rule.actionId}.`);
  }

  for (const o of def.objectives ?? []) {
    if (o.satisfiedByAnyOf.length === 0)
      add("empty_objective", `Objetivo ${o.id} sem ações que o satisfaçam.`);
    for (const id of o.satisfiedByAnyOf)
      if (!actionIds.has(id)) add("unknown_action", `Objetivo ${o.id} referencia ação ${id}.`);
  }

  /* ------------------------------------------------------- conclusão ---- */
  for (const id of def.completion.resolutionActionIds)
    if (!actionIds.has(id)) add("unknown_action", `Ação de resolução inexistente: ${id}.`);
  if (def.completion.maxClinicalSeconds <= 0)
    add("invalid_completion", "maxClinicalSeconds inválido.");

  const producesStabilized =
    def.actions.some((a) => a.statePatch?.addTags?.includes(def.completion.stabilizedTag)) ||
    def.timeTriggers.some((t) => t.statePatch?.addTags?.includes(def.completion.stabilizedTag));
  if (!producesStabilized)
    add(
      "unreachable_stabilization",
      `Nenhuma ação ou gatilho produz a tag de estabilização "${def.completion.stabilizedTag}".`,
    );

  /* --------------------------------------------------------- andaime ---- */
  // Palavras clínicas genéricas não vazam diagnóstico: descrevem o exame, não a hipótese.
  const genericTerms = new Set([
    "aguda",
    "agudo",
    "aérea",
    "aerea",
    "arterial",
    "cardíaca",
    "cardiaca",
    "compatível",
    "compativel",
    "comprometimento",
    "grave",
    "início",
    "inicio",
    "provável",
    "provavel",
    "quadro",
    "respiratória",
    "respiratoria",
    "secundária",
    "secundaria",
    "súbita",
    "subita",
  ]);
  const leakTerms = [def.hidden.diagnosis, ...def.hidden.differentials]
    .flatMap((t) => t.toLowerCase().split(/[\s,;()]+/))
    .filter((w) => w.length >= 5 && !genericTerms.has(w));

  const pointIds = new Set<string>();
  for (const point of def.guidance?.points ?? []) {
    if (pointIds.has(point.id)) add("duplicate_guidance_point", `Ponto duplicado: ${point.id}.`);
    pointIds.add(point.id);
    if (!point.educationalPurpose.trim())
      add("guidance_no_purpose", `Ponto ${point.id} sem propósito educacional.`);

    const guided = point.guidedOptions ?? [];
    const adaptive = point.adaptiveOptions ?? [];
    if (guided.length === 0 && adaptive.length === 0)
      add("empty_guidance_point", `Ponto ${point.id} sem opções autorais.`);
    if (guided.length > 0 && guided.length !== 3)
      add("invalid_guided_density", `Ponto ${point.id}: básico exige exatamente 3 opções.`);
    if (adaptive.length > 5)
      add("invalid_adaptive_density", `Ponto ${point.id}: intermediário permite no máximo 5.`);
    if (adaptive.length > 0 && adaptive.length < 3)
      add("weak_adaptive_density", `Ponto ${point.id}: intermediário precisa de ao menos 3 opções.`);

    for (const id of point.resolvedByActionIds ?? [])
      if (!actionIds.has(id))
        add("unknown_action", `Ponto ${point.id} resolve por ação inexistente: ${id}.`);

    const seen = new Set<string>();
    for (const option of [...guided, ...adaptive]) {
      if (!actionIds.has(option.actionId))
        add("unknown_action", `Opção ${option.id} referencia ação inexistente: ${option.actionId}.`);
      const key = `${guided.includes(option) ? "g" : "a"}:${option.actionId}`;
      if (seen.has(key)) add("duplicate_guidance_option", `Opção repetida em ${point.id}: ${option.actionId}.`);
      seen.add(key);
      const label = option.label.toLowerCase();
      if (leakTerms.some((term) => label.includes(term)))
        add("guidance_diagnosis_leak", `Opção ${option.id} revela verdade oculta do caso.`);
      if (option.objectiveId && !(def.objectives ?? []).some((o) => o.id === option.objectiveId))
        add("unknown_objective", `Opção ${option.id} referencia objetivo inexistente.`);
    }
  }
  const zoneIds = new Set<string>();
  for (const zone of def.guidance?.freeReasoningZones ?? []) {
    if (zoneIds.has(zone.id)) add("duplicate_free_zone", `Zona livre duplicada: ${zone.id}.`);
    zoneIds.add(zone.id);
    if (!zone.educationalPurpose.trim())
      add("free_zone_no_purpose", `Zona ${zone.id} sem propósito educacional.`);
  }
  if (def.meta.difficulty === "avancado" && (def.guidance?.points.length ?? 0) > 0)
    add("advanced_has_guidance", "Caso avançado não pode ter pontos de guiagem.");

  /* ------------------------------------------------------- variantes ---- */
  for (const v of def.variants ?? []) {
    for (const id of Object.keys(v.investigationResults ?? {}))
      if (!invIds.has(id))
        add("unknown_investigation", `Variante ${v.id} substitui investigação inexistente: ${id}.`);
    for (const t of v.extraTimeTriggers ?? [])
      if (triggerIds.has(t.id))
        add("duplicate_trigger", `Variante ${v.id} redefine o gatilho ${t.id}.`);
  }

  return { caseId: def.id, ok: issues.length === 0, issues };
}

export function validateCases(defs: ClinicalCaseDefinition[]): CaseValidationReport[] {
  return defs.map(validateCase);
}
