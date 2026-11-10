/**
 * Fluxo conversacional calmo (não é um app de chat).
 * Uma resposta canônica do Sombra por turno: mesmo texto para UI e, na Phase 05, TTS.
 */
export type ShadowMessageRole = "shadow" | "trainee" | "system" | "patient" | "team";

export type ShadowMessage = {
  id: string;
  role: ShadowMessageRole;
  text: string;
  /** Epoch ms. */
  at: number;
  /** Tempo clínico (segundos) quando aplicável. */
  clinicalTime?: number | undefined;
};

export function createMessage(
  role: ShadowMessageRole,
  text: string,
  clinicalTime?: number,
): ShadowMessage {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    at: Date.now(),
    clinicalTime,
  };
}

/** Contexto mínimo enviado ao modelo — nunca histórico ilimitado. */
export function recentContext(messages: ShadowMessage[], limit = 6): string {
  return messages
    .slice(-limit)
    .map((m) => `${({ shadow: "Sombra", trainee: "Médico", system: "Sistema", patient: "Paciente", team: "Equipe" })[m.role]}: ${m.text}`)
    .join("\n");
}
