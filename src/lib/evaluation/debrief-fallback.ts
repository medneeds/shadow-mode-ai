/**
 * Debriefing determinístico — nunca depende de LLM.
 *
 * Se a geração de linguagem falhar (ou o provedor não existir), o trainee
 * recebe o mesmo conteúdo educacional, redigido a partir da avaliação.
 */
import type { Debriefing, SessionEvaluation } from "./evaluation-types";

export function deterministicDebriefing(evaluation: SessionEvaluation): Debriefing {
  const parts: string[] = [
    `${evaluation.bandLabel} — ${evaluation.overallScore}/100. ${evaluation.headline}`,
  ];

  const weakest = [...evaluation.categories]
    .filter((c) => c.maxScore > 0)
    .sort((a, b) => a.percentage - b.percentage)[0];
  if (weakest && weakest.percentage < 100) {
    parts.push(`O domínio com maior perda foi ${weakest.label.toLowerCase()} (${weakest.percentage}%).`);
  }

  if (evaluation.criticalIssues.length === 0) {
    parts.push("Nenhuma falha crítica de segurança foi registrada nesta estação.");
  } else {
    parts.push(evaluation.criticalIssues[0] as string);
  }

  parts.push(evaluation.outcome + ".");

  return {
    summary: parts.join(" "),
    improvements: evaluation.improvements,
    fallback: true,
  };
}
