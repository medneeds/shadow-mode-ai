/**
 * Input Interpreter — porta única de classificação da entrada do usuário.
 *
 *   USER INPUT
 *       ↓
 *   INPUT INTERPRETER (este módulo)
 *       ↓ classify
 *   ┌───────────────┬──────────────────────┬──────────────────────┐
 *   │ MetaCommand   │ ConfigurationIntent  │ ClinicalInput        │
 *   │ sessão / UI   │ configuração         │ TraineeInput →       │
 *   │               │ da estação           │ Action Interpreter → │
 *   │               │                      │ Clinical Case Engine │
 *   └───────────────┴──────────────────────┴──────────────────────┘
 *
 * NÃO implementamos aqui nenhum interpretador real: nem LLM, nem casamento
 * de palavras-chave. Heurísticas frágeis criariam classificações erradas —
 * e uma classificação errada envia "pausar estação" para a pontuação clínica.
 * Enquanto não houver interpretador, o resultado é sempre `unclassified`,
 * e a UI trata a entrada pelo contexto explícito (composer clínico, ícones).
 */
import type { RecognizedConfigurationIntent } from "./configuration-intent";
import type { RecognizedMetaCommand } from "./meta-command";

export type InterpreterPhase = "pre_station" | "active_station";

export type InputClassificationKind =
  | "meta_command"
  | "configuration_intent"
  | "clinical_input"
  | "unclassified";

export type InputClassificationRequest = {
  /** Texto original (digitado ou transcrito). Nunca é descartado. */
  rawContent: string;
  source: "voice" | "text";
  phase: InterpreterPhase;
};

export type InputClassification =
  | { kind: "meta_command"; commands: RecognizedMetaCommand[] }
  | { kind: "configuration_intent"; intents: RecognizedConfigurationIntent[] }
  | { kind: "clinical_input"; rawContent: string }
  /** Nenhum interpretador disponível ou intenção ambígua. Nunca pontua. */
  | { kind: "unclassified"; reason: string };

/**
 * Contrato que a fase futura (LLM) implementa. A UI e a sessão dependem
 * apenas desta assinatura — nunca da implementação.
 */
export type InputInterpreter = {
  classify(request: InputClassificationRequest): Promise<InputClassification>;
};

/**
 * Interpretador nulo desta fase. Explícito e honesto: não adivinha.
 */
export const nullInputInterpreter: InputInterpreter = {
  async classify(request) {
    return {
      kind: "unclassified",
      reason: `Interpretador de linguagem natural ainda não implementado (fase: ${request.phase}).`,
    };
  },
};

/**
 * Barreira de segurança do pipeline: só entrada classificada como clínica
 * pode virar TraineeInput e chegar ao Case Engine / pontuação.
 */
export function isScorable(classification: InputClassification): boolean {
  return classification.kind === "clinical_input";
}
