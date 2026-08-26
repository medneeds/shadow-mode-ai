/**
 * ResponseFastPath (client-safe, determinístico).
 *
 * Fatos simples do Case Engine (vital, achado, resultado, confirmação) não
 * precisam de um modelo generativo apenas para serem reformulados.
 * Este caminho reduz latência sem tocar na verdade clínica.
 *
 * Regras:
 *  - o conteúdo médico é EXATAMENTE o fato emitido pelo motor;
 *  - o perfil do treinador só altera a costura entre frases;
 *  - nada de validação ("boa", "perfeito") nem de sugestão de conduta.
 */
import type { TrainerProfile } from "@/lib/shadow-trainer";

const MAX_FACTS = 3;
const MAX_CHARS = 260;

/** Frases longas ou eventos complexos vão para o caminho generativo. */
export function isFastPathEligible(facts: string[]): boolean {
  if (facts.length === 0 || facts.length > MAX_FACTS) return false;
  const total = facts.reduce((sum, f) => sum + f.length, 0);
  if (total > MAX_CHARS) return false;
  return facts.every((f) => f.length <= 180);
}

function tidy(fact: string): string {
  const trimmed = fact.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

/** Agrupa fatos do MESMO momento clínico em uma resposta curta e coerente. */
export function composeFastPathResponse(facts: string[], profile: TrainerProfile): string {
  const clean = facts.map(tidy);

  switch (profile) {
    case "fast_paced":
      // Pressão operacional: o mínimo de palavras possível.
      return clean.join(" ");
    case "assertive":
      return clean.join(" ");
    case "gentle":
      return clean.join(" ");
    case "permissive":
      return clean.length > 1
        ? `${clean[0]} ${clean.slice(1).join(" ")}`
        : (clean[0] as string);
    default:
      return clean.join(" ");
  }
}
