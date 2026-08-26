/**
 * Phase 03 — utilitários de validação determinística do Case Engine.
 *
 * O projeto não possui framework de testes configurado; estas verificações são
 * puras e podem ser executadas por script (bun) ou pelo harness de dev.
 */
import {
  advanceClinicalTime,
  applyAction,
  buildAction,
  initializeCase,
} from "./clinical-case-engine";
import type { ClinicalCaseDefinition, ClinicalCaseRuntime } from "./clinical-case-types";
import { referenceCase } from "./reference-cases";

export type CheckResult = { name: string; passed: boolean; detail: string };

type Step = { kind: "action"; actionId: string } | { kind: "time"; seconds: number };

/** Executa uma sequência determinística sobre uma cópia nova do runtime. */
export function runSequence(
  steps: Step[],
  def: ClinicalCaseDefinition = referenceCase,
): ClinicalCaseRuntime {
  let runtime = initializeCase(def);
  for (const step of steps) {
    if (step.kind === "time") {
      runtime = advanceClinicalTime(runtime, step.seconds, def).runtime;
    } else {
      const action = buildAction(def, runtime, step.actionId, "dev_harness", 0);
      runtime = applyAction(runtime, action, def).runtime;
    }
  }
  return runtime;
}

const fired = (r: ClinicalCaseRuntime, id: string) => r.firedTriggerIds.includes(id);

export function runEngineChecks(): CheckResult[] {
  const results: CheckResult[] = [];

  // A — ação crítica dentro da janela: sem gatilho de omissão.
  const a = runSequence([
    { kind: "time", seconds: 40 },
    { kind: "action", actionId: "check_capillary_glucose" },
    { kind: "time", seconds: 200 },
  ]);
  results.push({
    name: "A — glicemia capilar dentro da janela não dispara deterioração",
    passed: !fired(a, "trg_glucose_omission_180"),
    detail: `gatilhos: ${a.firedTriggerIds.join(", ") || "nenhum"}`,
  });

  // B — omissão além do limiar: deterioração predefinida.
  const b = runSequence([{ kind: "time", seconds: 200 }]);
  results.push({
    name: "B — omissão da ação crítica dispara deterioração predefinida",
    passed:
      fired(b, "trg_glucose_omission_180") &&
      b.patient.tags.includes("deterioração") &&
      b.patient.vitals.heartRate === 118,
    detail: `FC ${b.patient.vitals.heartRate}, tags: ${b.patient.tags.join(", ")}`,
  });

  // C — investigação: indisponível antes do delay, disponível depois.
  const cBefore = runSequence([
    { kind: "action", actionId: "check_capillary_glucose" },
    { kind: "time", seconds: 20 },
  ]);
  const cAfter = runSequence([
    { kind: "action", actionId: "check_capillary_glucose" },
    { kind: "time", seconds: 40 },
  ]);
  results.push({
    name: "C — resultado indisponível antes do prazo e disponível depois",
    passed:
      cBefore.investigations["inv_capillary_glucose"]?.status === "requested" &&
      cAfter.investigations["inv_capillary_glucose"]?.status === "available" &&
      cAfter.patient.vitals.glucoseMgDl === 28,
    detail: `20s: ${cBefore.investigations["inv_capillary_glucose"]?.status} · 40s: ${cAfter.investigations["inv_capillary_glucose"]?.status}`,
  });

  // D — tratamento apropriado produz melhora predefinida.
  const d = runSequence([
    { kind: "action", actionId: "check_capillary_glucose" },
    { kind: "time", seconds: 30 },
    { kind: "action", actionId: "obtain_iv_access" },
    { kind: "action", actionId: "administer_glucose" },
  ]);
  results.push({
    name: "D — glicose intravenosa produz melhora de estado predefinida",
    passed:
      d.patient.consciousness === "confused" &&
      d.patient.neurologic.gcs === 13 &&
      d.outcome === "stabilized",
    detail: `consciência: ${d.patient.consciousness}, Glasgow ${d.patient.neurologic.gcs}, desfecho: ${d.outcome}`,
  });

  // D2 — tratamento sem acesso venoso não é aplicável (pré-requisito).
  const d2 = runSequence([{ kind: "action", actionId: "administer_glucose" }]);
  results.push({
    name: "D2 — tratamento sem pré-requisito é registrado como não aplicável",
    passed:
      d2.actionLog[0]?.status === "not_applicable" && d2.patient.consciousness === "unresponsive",
    detail: `status: ${d2.actionLog[0]?.status}`,
  });

  // E — reprodutibilidade: mesma sequência, mesmo resultado.
  const steps: Step[] = [
    { kind: "time", seconds: 30 },
    { kind: "action", actionId: "assess_airway" },
    { kind: "action", actionId: "check_capillary_glucose" },
    { kind: "time", seconds: 60 },
    { kind: "action", actionId: "obtain_iv_access" },
    { kind: "action", actionId: "administer_glucose" },
    { kind: "time", seconds: 120 },
    { kind: "action", actionId: "reassess_patient" },
  ];
  const e1 = runSequence(steps);
  const e2 = runSequence(steps);
  const strip = (r: ClinicalCaseRuntime) =>
    JSON.stringify({
      patient: r.patient,
      events: r.events,
      actions: r.actionLog.map((a) => [a.actionId, a.status, a.clinicalTime]),
      triggers: r.firedTriggerIds,
      outcome: r.outcome,
    });
  results.push({
    name: "E — mesma sequência e mesmos tempos produzem evolução idêntica",
    passed: strip(e1) === strip(e2),
    detail: `${e1.events.length} eventos, desfecho ${e1.outcome}`,
  });

  // F — nenhuma informação oculta vaza no log de eventos.
  const leak = e1.events.some(
    (ev) =>
      ev.fact.toLowerCase().includes("hipoglicemia grave secundária") ||
      ev.fact.toLowerCase().includes("você deveria") ||
      ev.fact.toLowerCase().includes("talvez"),
  );
  results.push({
    name: "F — eventos não revelam diagnóstico oculto nem sugerem conduta",
    passed: !leak,
    detail: `${e1.events.length} eventos verificados`,
  });

  return results;
}
