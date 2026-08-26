/**
 * Telemetria de latência por turno — SOMENTE desenvolvimento.
 *
 * Nunca aparece na UI de produção. Serve para auditar o pipeline:
 * fala → STT → interpretação → motor → treinador → TTS → reprodução.
 */
export type TurnStage =
  | "speechEnd"
  | "transcriptReady"
  | "interpretationReady"
  | "caseEngineReady"
  | "shadowResponseReady"
  | "ttsRequested"
  | "audioReady"
  | "playbackStarted";

export type TurnLatencyMetrics = Partial<Record<TurnStage, number>> & { turnId: string };

const enabled = typeof import.meta !== "undefined" && Boolean(import.meta.env?.DEV);
const turns = new Map<string, TurnLatencyMetrics>();

export function markTurn(turnId: string, stage: TurnStage): void {
  if (!enabled) return;
  const metrics = turns.get(turnId) ?? { turnId };
  metrics[stage] = performance.now();
  turns.set(turnId, metrics);
}

function delta(m: TurnLatencyMetrics, from: TurnStage, to: TurnStage): number | null {
  const a = m[from];
  const b = m[to];
  return typeof a === "number" && typeof b === "number" ? Math.round(b - a) : null;
}

/** Fecha o turno e imprime o resumo no console de desenvolvimento. */
export function reportTurn(turnId: string): void {
  if (!enabled) return;
  const m = turns.get(turnId);
  if (!m) return;
  turns.delete(turnId);
  const start = m.speechEnd ?? m.transcriptReady;
  const end = m.playbackStarted ?? m.shadowResponseReady;
  // eslint-disable-next-line no-console
  console.debug("[sombra] latência do turno", {
    turnId,
    stt: delta(m, "speechEnd", "transcriptReady"),
    interpretacao: delta(m, "transcriptReady", "interpretationReady"),
    motor: delta(m, "interpretationReady", "caseEngineReady"),
    resposta: delta(m, "caseEngineReady", "shadowResponseReady"),
    tts: delta(m, "ttsRequested", "audioReady"),
    total:
      typeof start === "number" && typeof end === "number" ? Math.round(end - start) : null,
  });
}
