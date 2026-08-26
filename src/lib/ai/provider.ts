/**
 * Interface estreita de LLM (client-safe: apenas tipos).
 *
 * Regra arquitetural: o domínio (Case Engine, sessão, UI) nunca conhece o
 * provedor. Qualquer provedor que implemente este contrato serve.
 */
export type LlmMessage = { role: "system" | "user"; content: string };

export type LlmJsonRequest = {
  messages: LlmMessage[];
  schemaName: string;
  jsonSchema: Record<string, unknown>;
  maxTokens?: number;
};

export type LlmTextRequest = {
  messages: LlmMessage[];
  maxTokens?: number;
};

export type LlmProvider = {
  /** Saída estruturada — validada por Zod na camada de cima. */
  generateJson(request: LlmJsonRequest): Promise<unknown>;
  /** Texto livre curto (fraseado do Sombra). */
  generateText(request: LlmTextRequest): Promise<string>;
};

/** Falha de inteligência. Nunca derruba a verdade clínica; ativa fallback. */
export class LlmUnavailableError extends Error {
  readonly status?: number | undefined;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "LlmUnavailableError";
    this.status = status;
  }
}
