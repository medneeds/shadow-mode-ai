/**
 * Debriefing (server-only) — o LLM apenas REDIGE.
 *
 * Fronteiras absolutas:
 * - Não altera nota, notas por domínio, ações perdidas, pontos críticos nem a
 *   verdade do caso.
 * - Não inventa consequências, condutas ideais ou "gold standard" próprio.
 * - Pós-estação o Sombra muda de papel: agora pode ensinar, de forma direta,
 *   específica e concisa. Sem elogio genérico e sem tom condescendente.
 */
import type { LlmProvider } from "@/lib/ai/provider";
import type { TrainerProfile } from "@/lib/shadow-trainer";
import { deterministicDebriefing } from "./debrief-fallback";
import type { Debriefing, SessionEvaluation } from "./evaluation-types";

const profileTone: Record<TrainerProfile, string> = {
  gentle: "Tom medido e sereno, sem suavizar conteúdo crítico.",
  assertive: "Tom direto e objetivo, sem rodeios.",
  fast_paced: "Frases curtas e econômicas.",
  permissive: "Tom conversacional, mantendo integralmente o conteúdo crítico.",
};

function summarize(evaluation: SessionEvaluation): string {
  const categories = evaluation.categories
    .map((c) => `- ${c.label}: ${c.score}/${c.maxScore} (${c.percentage}%)`)
    .join("\n");
  const critical =
    evaluation.criticalIssues.length > 0
      ? evaluation.criticalIssues.map((i) => `- ${i}`).join("\n")
      : "- Nenhum ponto crítico registrado.";
  return [
    `Nota determinística: ${evaluation.overallScore}/100 (${evaluation.bandLabel}).`,
    `Desfecho da estação: ${evaluation.outcome}.`,
    `Domínios:\n${categories}`,
    `Acertos relevantes:\n${evaluation.strengths.map((s) => `- ${s}`).join("\n") || "- Nenhum registrado."}`,
    `Perdas e omissões:\n${evaluation.misses.map((s) => `- ${s}`).join("\n") || "- Nenhuma."}`,
    `Pontos críticos:\n${critical}`,
    `Recomendações determinísticas (reescreva-as, sem acrescentar novas):\n${evaluation.improvements
      .map((s) => `- ${s}`)
      .join("\n")}`,
  ].join("\n\n");
}

export async function generateDebriefingText(
  provider: LlmProvider | null,
  evaluation: SessionEvaluation,
  profile: TrainerProfile,
): Promise<Debriefing> {
  const fallback = deterministicDebriefing(evaluation);
  if (!provider) return fallback;

  const system = `Você é o SOMBRA em modo DEBRIEFING, treinador clínico em português do Brasil.
${profileTone[profile]}
Regras invioláveis:
- Nunca altere, recalcule, arredonde nem comente a justiça da nota.
- Use SOMENTE os fatos, omissões e consequências fornecidos. Não invente nada.
- Não esconda conteúdo crítico, qualquer que seja o tom pedido.
- Sem elogio genérico, sem linguagem condescendente, sem listas de emojis.
Formato de saída (texto puro, exatamente esta estrutura):
RESUMO: uma a três frases, específicas e clínicas.
MELHORIAS: uma recomendação por linha, iniciada por "- ", reescrevendo as recomendações fornecidas sem criar novas.`;

  try {
    const text = await provider.generateText({
      messages: [
        { role: "system", content: system },
        { role: "user", content: summarize(evaluation) },
      ],
      maxTokens: 1600,
    });
    if (!text) return fallback;

    const summaryMatch = /RESUMO:\s*([\s\S]*?)(?:\n\s*MELHORIAS:|$)/i.exec(text);
    const improvementsBlock = /MELHORIAS:\s*([\s\S]*)$/i.exec(text)?.[1] ?? "";
    const improvements = improvementsBlock
      .split("\n")
      .map((line) => line.replace(/^[-•*]\s*/, "").trim())
      .filter((line) => line.length > 0)
      .slice(0, evaluation.improvements.length);

    const summary = (summaryMatch?.[1] ?? "").trim();
    if (!summary) return fallback;

    return {
      summary,
      improvements: improvements.length > 0 ? improvements : evaluation.improvements,
      fallback: false,
    };
  } catch {
    // A avaliação determinística sobrevive à indisponibilidade de IA.
    return fallback;
  }
}
