/**
 * InteractionContext (client-safe, puro).
 *
 * Contexto de trabalho compacto entregue à camada de inteligência.
 * Regra: ESTADO ESTRUTURADO importa mais que transcrição. Nunca inclui
 * diagnóstico oculto, rubrica, ações esperadas ou critérios de pontuação.
 */
import type {
  ClinicalCaseDefinition,
  ClinicalCaseRuntime,
} from "@/lib/clinical/clinical-case-types";

export type InteractionContext = {
  phase: "pre_station" | "active_station";
  clinicalTime: number;
  /** Estado observável do paciente (o que o trainee pode perceber/medir). */
  observable: string;
  /** Últimas ações já realizadas — memória clínica estruturada. */
  recentActions: { actionId: string; label: string; atSecond: number }[];
  /** Últimos fatos emitidos pelo motor. */
  recentEvents: string[];
  /** Investigações solicitadas e ainda sem resultado. */
  pendingInvestigations: string[];
  /** Investigações com resultado já disponível/entregue. */
  availableInvestigations: string[];
  /** Última resposta canônica do Sombra. */
  lastShadowResponse?: string | undefined;
  /** Últimas falas do trainee (curtas). */
  recentTraineeInputs: string[];
};

/** Somente estado OBSERVÁVEL — nunca diagnóstico, rubrica ou ações esperadas. */
export function observableStateSummary(runtime: ClinicalCaseRuntime): string {
  const p = runtime.patient;
  const v = p.vitals;
  const parts = [
    `consciência=${p.consciousness}`,
    `via aérea=${p.airway}`,
    `esforço respiratório=${p.breathing.effort}`,
    `perfusão=${p.circulation.perfusion}`,
    `FC=${v.heartRate}`,
    `FR=${v.respiratoryRate}`,
    `PA=${v.systolicBP}/${v.diastolicBP}`,
    `SpO2=${v.oxygenSaturation}`,
  ];
  if (typeof v.glucoseMgDl === "number") parts.push(`glicemia=${v.glucoseMgDl}`);
  return parts.join("; ");
}

export function buildInteractionContext(params: {
  def: ClinicalCaseDefinition;
  runtime: ClinicalCaseRuntime;
  /** Conversa recente já resumida (poucas linhas). */
  conversation?: string | undefined;
}): InteractionContext {
  const { def, runtime } = params;

  const investigationName = (id: string) =>
    def.investigations.find((i) => i.id === id)?.name ?? id;

  const pending: string[] = [];
  const available: string[] = [];
  for (const [id, state] of Object.entries(runtime.investigations)) {
    if (state.status === "requested") pending.push(investigationName(id));
    if (state.status === "available" || state.status === "delivered") {
      available.push(investigationName(id));
    }
  }

  const conversationLines = (params.conversation ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const traineeLines = conversationLines
    .filter((l) => l.startsWith("Trainee:"))
    .slice(-3)
    .map((l) => l.replace(/^Trainee:\s*/, ""));
  const lastShadow = [...conversationLines].reverse().find((l) => l.startsWith("Sombra:"));

  return {
    phase: "active_station",
    clinicalTime: runtime.elapsedClinicalSeconds,
    observable: observableStateSummary(runtime),
    recentActions: runtime.actionLog.slice(-8).map((a) => ({
      actionId: a.actionId,
      label: a.label,
      atSecond: a.clinicalTime,
    })),
    recentEvents: runtime.events.slice(-4).map((e) => e.fact),
    pendingInvestigations: pending,
    availableInvestigations: available,
    lastShadowResponse: lastShadow?.replace(/^Sombra:\s*/, ""),
    recentTraineeInputs: traineeLines,
  };
}

/** Serialização compacta — nunca transcrição integral da estação. */
export function serializeInteractionContext(context: InteractionContext): string {
  const lines = [
    `Tempo clínico: ${context.clinicalTime}s`,
    `Estado observável: ${context.observable}`,
    context.recentActions.length > 0
      ? `Já realizado (não repetir como novidade): ${context.recentActions
          .map((a) => `${a.label} (${a.actionId}, ${a.atSecond}s)`)
          .join("; ")}`
      : "Nenhuma ação registrada até agora.",
    context.pendingInvestigations.length > 0
      ? `Resultados pendentes: ${context.pendingInvestigations.join("; ")}`
      : null,
    context.availableInvestigations.length > 0
      ? `Resultados já disponíveis: ${context.availableInvestigations.join("; ")}`
      : null,
    context.recentEvents.length > 0 ? `Fatos recentes: ${context.recentEvents.join(" | ")}` : null,
    context.lastShadowResponse ? `Última fala do Sombra: ${context.lastShadowResponse}` : null,
    context.recentTraineeInputs.length > 0
      ? `Últimas falas do trainee: ${context.recentTraineeInputs.join(" | ")}`
      : null,
  ].filter(Boolean) as string[];
  return lines.join("\n");
}
