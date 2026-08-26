/**
 * MetaCommand — comandos de PRODUTO expressos em linguagem natural.
 *
 * Regra arquitetural crítica:
 *   MetaCommand NUNCA entra no pipeline clínico nem na pontuação.
 *   "Pausar estação" não é conduta. "Troque para voz feminina" não é conduta.
 *
 *   USER INPUT → INPUT INTERPRETER → classify
 *      ├── MetaCommand      → sessão / UI
 *      └── ClinicalInput    → TraineeInput → Action Interpreter → Case Engine
 */
import type {
  ShadowOutputMode,
  TraineeInputMode,
  TrainerProfile,
  VoicePreference,
} from "../shadow-trainer";

export type MetaCommandType =
  | "pause_session"
  | "resume_session"
  | "finish_session"
  | "change_input_mode"
  | "change_shadow_output_mode"
  | "change_voice"
  | "change_trainer_profile"
  | "change_speech_rate";

/** Ritmo de fala do Sombra — apresentação apenas; não altera a verdade clínica. */
export type SpeechRate = "slower" | "normal" | "faster";

export type MetaCommand =
  | { type: "pause_session" }
  | { type: "resume_session" }
  | { type: "finish_session" }
  | { type: "change_input_mode"; value: TraineeInputMode }
  | { type: "change_shadow_output_mode"; value: ShadowOutputMode }
  | { type: "change_voice"; value: VoicePreference }
  | { type: "change_trainer_profile"; value: TrainerProfile }
  | { type: "change_speech_rate"; value: SpeechRate };

/** Comando reconhecido, com rastreabilidade da entrada original. */
export type RecognizedMetaCommand = {
  command: MetaCommand;
  /** Trecho da entrada original que motivou o comando, quando identificável. */
  sourceExcerpt?: string;
  /** Confiança da classificação (0..1), quando disponível. */
  confidence?: number;
};

/** Rótulos pt-BR para feedback contextual discreto na interface. */
export const metaCommandLabels: Record<MetaCommandType, string> = {
  pause_session: "Estação pausada",
  resume_session: "Estação retomada",
  finish_session: "Estação encerrada",
  change_input_mode: "Forma de responder atualizada",
  change_shadow_output_mode: "Respostas do Sombra atualizadas",
  change_voice: "Voz do Sombra atualizada",
  change_trainer_profile: "Perfil do treinador atualizado",
  change_speech_rate: "Ritmo de fala atualizado",
};

/**
 * Comandos que só fazem sentido com uma estação em andamento.
 * A camada de sessão usa isso para descartar comandos fora de contexto
 * sem precisar conhecer a interpretação.
 */
export function requiresActiveSession(command: MetaCommand): boolean {
  return (
    command.type === "pause_session" ||
    command.type === "resume_session" ||
    command.type === "finish_session"
  );
}
