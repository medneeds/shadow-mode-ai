/**
 * Phase 06 — verificações determinísticas do Evaluation Engine.
 *
 * Puras e executáveis por script (bun) ou pelo harness de dev.
 */
import { runSequence } from "@/lib/clinical/engine-checks";
import type { ClinicalCaseRuntime } from "@/lib/clinical/clinical-case-types";
import { referenceCase } from "@/lib/clinical/reference-cases";
import { createSession, defaultConfig, type TrainingSession } from "@/lib/training-session";
import { evaluateSession } from "./evaluation-engine";
import type { SessionEvaluation } from "./evaluation-types";

export type CheckResult = { name: string; passed: boolean; detail: string };

type Step = { kind: "action"; actionId: string } | { kind: "time"; seconds: number };

function fakeSession(overrides: Partial<TrainingSession["config"]> = {}): TrainingSession {
  const session = createSession({ ...defaultConfig, ...overrides });
  return { ...session, status: "finished", completed: true, finishedAt: session.startedAt };
}

function evaluate(steps: Step[], session = fakeSession()): SessionEvaluation {
  const runtime: ClinicalCaseRuntime = runSequence(steps, referenceCase);
  return evaluateSession(referenceCase, runtime, session);
}

const strongRun: Step[] = [
  { kind: "time", seconds: 20 },
  { kind: "action", actionId: "assess_airway" },
  { kind: "action", actionId: "assess_breathing" },
  { kind: "action", actionId: "assess_circulation" },
  { kind: "action", actionId: "place_monitoring" },
  { kind: "action", actionId: "obtain_iv_access" },
  { kind: "action", actionId: "check_capillary_glucose" },
  { kind: "time", seconds: 40 },
  { kind: "action", actionId: "history_family" },
  { kind: "action", actionId: "history_medications" },
  { kind: "action", actionId: "administer_glucose" },
  { kind: "action", actionId: "reassess_patient" },
  { kind: "action", actionId: "disposition_observation" },
];

export function runEvaluationChecks(): CheckResult[] {
  const results: CheckResult[] = [];

  // 1 — desempenho forte: ações críticas nas janelas corretas.
  const strong = evaluate(strongRun);
  results.push({
    name: "1 — desempenho forte gera nota alta e nenhum ponto crítico",
    passed: strong.overallScore >= 90 && strong.criticalIssues.length === 0,
    detail: `nota ${strong.overallScore}, críticos: ${strong.criticalIssues.length}`,
  });

  // 2 — ação crítica atrasada: crédito parcial.
  const late = evaluate([
    { kind: "time", seconds: 240 },
    { kind: "action", actionId: "check_capillary_glucose" },
    { kind: "time", seconds: 40 },
    { kind: "action", actionId: "obtain_iv_access" },
    { kind: "action", actionId: "administer_glucose" },
    { kind: "action", actionId: "reassess_patient" },
  ]);
  const lateGlucose = late.actions.find((a) => a.actionId === "check_capillary_glucose");
  results.push({
    name: "2 — ação crítica fora da janela recebe crédito parcial",
    passed:
      lateGlucose?.outcome === "completed_late" &&
      lateGlucose.earned > 0 &&
      lateGlucose.earned < lateGlucose.weight,
    detail: `${lateGlucose?.earned}/${lateGlucose?.weight} (${lateGlucose?.outcome})`,
  });

  // 3 — omissão crítica: perda total + ponto crítico com consequência real.
  const omitted = evaluate([{ kind: "time", seconds: 400 }]);
  const omission = omitted.criticalOmissions.find((o) => o.actionId === "check_capillary_glucose");
  results.push({
    name: "3 — omissão crítica zera crédito e gera ponto crítico com consequência ocorrida",
    passed:
      omitted.actions.find((a) => a.actionId === "check_capillary_glucose")?.earned === 0 &&
      omission !== undefined &&
      Boolean(omission.consequence),
    detail: `nota ${omitted.overallScore}, críticos: ${omitted.criticalIssues.length}`,
  });

  // 4 — tratamento sem reavaliação: crédito de tratamento, reavaliação zerada.
  const noReassess = evaluate([
    { kind: "time", seconds: 20 },
    { kind: "action", actionId: "check_capillary_glucose" },
    { kind: "time", seconds: 40 },
    { kind: "action", actionId: "obtain_iv_access" },
    { kind: "action", actionId: "administer_glucose" },
  ]);
  const treatment = noReassess.categories.find((c) => c.category === "treatment");
  const reassessment = noReassess.categories.find((c) => c.category === "reassessment");
  results.push({
    name: "4 — tratamento sem reavaliação mantém tratamento e zera reavaliação",
    passed: treatment?.percentage === 100 && reassessment?.percentage === 0,
    detail: `tratamento ${treatment?.percentage}% · reavaliação ${reassessment?.percentage}%`,
  });

  // 5 — reprodutibilidade.
  const r1 = evaluate(strongRun);
  const r2 = evaluate(strongRun);
  results.push({
    name: "5 — mesma execução produz avaliação idêntica",
    passed: JSON.stringify(r1) === JSON.stringify(r2),
    detail: `nota ${r1.overallScore} = ${r2.overallScore}`,
  });

  // 6 — neutralidade de modalidade, voz, perfil e ritmo.
  const voiceRun = evaluate(
    strongRun,
    fakeSession({
      traineeInputMode: "voice",
      shadowOutputMode: "text",
      voicePreference: "male",
      trainerProfile: "permissive",
      speechRate: "faster",
    }),
  );
  results.push({
    name: "6 — modalidade, voz, perfil e ritmo não alteram a avaliação",
    passed: JSON.stringify(voiceRun) === JSON.stringify(r1),
    detail: `voz ${voiceRun.overallScore} = texto ${r1.overallScore}`,
  });

  // 7 — ação insegura definida pelo caso gera penalidade e ponto crítico.
  const unsafe = evaluate([
    { kind: "time", seconds: 60 },
    { kind: "action", actionId: "request_head_ct" },
    { kind: "time", seconds: 200 },
  ]);
  results.push({
    name: "7 — ação insegura definida pelo caso penaliza e aparece nos pontos críticos",
    passed: unsafe.penaltyPoints === 6 && unsafe.unsafeActions.length === 1,
    detail: `penalidade ${unsafe.penaltyPoints}, nota ${unsafe.overallScore}`,
  });

  // 8 — redundância inofensiva não é penalizada.
  const redundant = evaluate([
    ...strongRun,
    { kind: "action", actionId: "assess_airway" },
    { kind: "action", actionId: "assess_breathing" },
  ]);
  results.push({
    name: "8 — pedidos duplicados inofensivos não reduzem a nota",
    passed: redundant.overallScore === strong.overallScore,
    detail: `${redundant.overallScore} = ${strong.overallScore}`,
  });

  // 9 — nada de falsa precisão: nota é inteira.
  results.push({
    name: "9 — nota é inteira (sem falsa precisão)",
    passed: Number.isInteger(strong.overallScore) && Number.isInteger(late.overallScore),
    detail: `${strong.overallScore} / ${late.overallScore}`,
  });

  // 10 — sem ponto crítico inventado quando nada crítico ocorreu.
  results.push({
    name: "10 — nenhum ponto crítico é inventado em execução completa",
    passed: strong.criticalOmissions.length === 0 && strong.unsafeActions.length === 0,
    detail: `omissões ${strong.criticalOmissions.length}, inseguras ${strong.unsafeActions.length}`,
  });

  return results;
}
