/**
 * Bandas de desempenho determinísticas. O LLM nunca escolhe a banda.
 */
import { performanceBandLabels, type PerformanceBand } from "./evaluation-types";

export function bandForScore(score: number): PerformanceBand {
  if (score >= 90) return "excelente";
  if (score >= 80) return "muito_bom";
  if (score >= 70) return "bom";
  if (score >= 60) return "em_desenvolvimento";
  return "precisa_revisao";
}

export function bandLabel(band: PerformanceBand): string {
  return performanceBandLabels[band];
}
