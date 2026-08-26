/**
 * Configuração conversacional — parte determinística (client-safe).
 * O LLM apenas extrai; as perguntas e o resumo são regras de produto.
 */
import type { LevelId } from "@/lib/shadow-content";
import { durationLabel, levelLabel, themeLabel } from "@/lib/training-session";
import { trainerProfileLabel, voicePreferenceLabel } from "@/lib/shadow-trainer";
import type { TrainingConfig } from "@/lib/training-session";

export type ConfigField = keyof TrainingConfig;

export const requiredFields: ConfigField[] = ["themeId", "levelId", "durationId"];

export const setupOpeningQuestion = "O que vamos treinar hoje?";

/** Só o que falta — divulgação progressiva, nunca um formulário falado. */
export function missingFields(provided: ConfigField[]): ConfigField[] {
  return requiredFields.filter((f) => !provided.includes(f));
}

const questions: Record<string, string> = {
  themeId: "Qual tema?",
  levelId: "Qual nível: básico, intermediário ou avançado?",
  durationId: "Quanto tempo de estação?",
};

export function nextSetupQuestion(provided: ConfigField[]): string | null {
  const missing = missingFields(provided);
  if (missing.length === 0) return null;
  if (missing.length === 1) return questions[missing[0] as string] ?? null;
  return missing.map((f) => questions[f as string]).join(" ");
}

/** Resumo compacto: "Emergência · Avançado · 15 min". */
export function configSummary(config: TrainingConfig): string {
  const minutes = durationLabel(config.durationId).replace(" minutos", " min");
  return `${themeLabel(config.themeId)} · ${levelLabel(config.levelId as LevelId)} · ${minutes}`;
}

/** Linha secundária discreta: "Incisivo · Voz feminina". */
export function configSecondaryLine(config: TrainingConfig): string {
  const voice =
    config.shadowOutputMode === "voice_text"
      ? `Voz ${voicePreferenceLabel(config.voicePreference).toLowerCase()}`
      : "Texto";
  return `${trainerProfileLabel(config.trainerProfile)} · ${voice}`;
}

export function readyConfirmation(): string {
  return "Pronto.";
}
