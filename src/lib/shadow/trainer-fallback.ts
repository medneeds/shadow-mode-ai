/**
 * Fallback determinístico (client-safe).
 * Se a inteligência falhar, o fato clínico do Case Engine ainda é comunicado.
 */
export function describeFactsDeterministically(
  facts: string[],
  clarification?: string | null,
): string {
  if (clarification) return clarification;
  if (facts.length === 0) return "Sem mudanças no momento.";
  return facts.join(" ");
}

export const unintelligibleReply = "Não entendi essa parte. Pode reformular?";
export const interpretationUnavailableReply =
  "Não consegui interpretar agora. Pode repetir de outra forma?";
