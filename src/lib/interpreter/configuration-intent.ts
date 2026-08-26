/**
 * ConfigurationIntent — configuração da estação por conversa.
 *
 * Antes da estação começar, o interpretador pode classificar a fala/texto do
 * usuário como intenção de configuração. O modelo tipado de TrainingConfig
 * continua sendo a verdade interna; a conversa é apenas a superfície.
 *
 *   "Emergência, avançado, 15 minutos. Seja incisivo."
 *      → select_theme(emergencia) + select_level(avancado)
 *      → select_duration(15) + select_trainer_profile(assertive)
 */
import type { LevelId } from "../shadow-content";
import type {
  ShadowOutputMode,
  TraineeInputMode,
  TrainerProfile,
  VoicePreference,
} from "../shadow-trainer";
import type { TrainingConfig } from "../training-session";

export type ConfigurationIntentType =
  | "select_theme"
  | "select_level"
  | "select_duration"
  | "select_trainer_profile"
  | "select_voice"
  | "select_output_mode"
  | "select_input_mode"
  | "confirm_configuration"
  | "start_session";

export type ConfigurationIntent =
  | { type: "select_theme"; value: string }
  | { type: "select_level"; value: LevelId }
  | { type: "select_duration"; value: string }
  | { type: "select_trainer_profile"; value: TrainerProfile }
  | { type: "select_voice"; value: VoicePreference }
  | { type: "select_output_mode"; value: ShadowOutputMode }
  | { type: "select_input_mode"; value: TraineeInputMode }
  | { type: "confirm_configuration" }
  | { type: "start_session" };

export type RecognizedConfigurationIntent = {
  intent: ConfigurationIntent;
  sourceExcerpt?: string;
  confidence?: number;
};

/** Campos mínimos para uma estação poder começar. */
export type RequiredConfigField = "themeId" | "levelId" | "durationId";

export const requiredConfigFields: RequiredConfigField[] = [
  "themeId",
  "levelId",
  "durationId",
];

/**
 * Configuração em construção durante a conversa. Campos ausentes são
 * exatamente o que o Sombra pode perguntar — nada mais (divulgação progressiva).
 */
export type PartialTrainingConfig = Partial<TrainingConfig>;

/** Aplica intenções sobre a configuração parcial, sem efeitos colaterais. */
export function applyConfigurationIntents(
  base: PartialTrainingConfig,
  intents: ConfigurationIntent[],
): PartialTrainingConfig {
  return intents.reduce<PartialTrainingConfig>((config, intent) => {
    switch (intent.type) {
      case "select_theme":
        return { ...config, themeId: intent.value };
      case "select_level":
        return { ...config, levelId: intent.value };
      case "select_duration":
        return { ...config, durationId: intent.value };
      case "select_trainer_profile":
        return { ...config, trainerProfile: intent.value };
      case "select_voice":
        return { ...config, voicePreference: intent.value };
      case "select_output_mode":
        return { ...config, shadowOutputMode: intent.value };
      case "select_input_mode":
        return { ...config, traineeInputMode: intent.value };
      case "confirm_configuration":
      case "start_session":
        return config;
    }
  }, base);
}

/** O que ainda falta perguntar. Vazio = pare de perguntar configuração. */
export function missingRequiredFields(
  config: PartialTrainingConfig,
): RequiredConfigField[] {
  return requiredConfigFields.filter((field) => config[field] == null);
}

/**
 * Preenche o que não foi dito com defaults de produto.
 * A arquitetura atual não persiste preferências; versões autenticadas futuras
 * podem substituir `defaults` por preferências do usuário sem mudar o contrato.
 */
export function resolveConfiguration(
  partial: PartialTrainingConfig,
  defaults: TrainingConfig,
): TrainingConfig {
  return { ...defaults, ...partial };
}
