/**
 * Entrada unificada do trainee.
 *
 * Regra arquitetural: o Case Engine NUNCA é desenhado em torno de "comandos de voz".
 * Voz e texto são apenas transportes diferentes que convergem para a MESMA estrutura:
 *
 *   VOZ  → (speech-to-text, fase futura) → TraineeInput
 *   TEXTO → (composer da sala)           → TraineeInput
 *                                            ↓
 *                              interpretação em linguagem natural (fase futura)
 *                                            ↓
 *                              TraineeAction[] (0..N por entrada)
 *                                            ↓
 *                              Clinical Case Engine → eventos clínicos
 *                                            ↓
 *                              Shadow Trainer Engine → uma única resposta
 *                                            ↓
 *                                    TEXTO  /  VOZ (TTS)
 *
 * A modalidade escolhida não influencia avaliação clínica. Conteúdo, correção,
 * priorização, tempo e sequência são as únicas dimensões avaliadas.
 */

export type TraineeInputSource = "voice" | "text";

export type TraineeInput = {
  id: string;
  sessionId: string;
  source: TraineeInputSource;
  /** Texto original do trainee (digitado ou transcrito). Nunca é descartado. */
  rawContent: string;
  /** Momento real (epoch ms) do envio. */
  timestamp: number;
  /** Tempo clínico da estação, em segundos desde o início. */
  clinicalTime: number;
  /**
   * Estado da interpretação. A extração estruturada (LLM) chega em fase futura;
   * aqui apenas preservamos o contrato.
   */
  interpretation?: TraineeInputInterpretation;
};

/** Ação clínica estruturada derivada de uma entrada — nunca substitui o texto original. */
export type TraineeAction = {
  /** Identificador do catálogo de ações do Case Engine (ex.: check_capillary_glucose). */
  actionId: string;
  /** Trecho da entrada original que motivou esta ação, quando identificável. */
  sourceExcerpt?: string;
  /** Confiança da interpretação (0..1), quando disponível. */
  confidence?: number;
};

/**
 * Uma entrada pode gerar 0..N ações clínicas.
 * Ex.: "Monitorizo, faço dois acessos e peço glicemia."
 *   → place_monitoring | obtain_iv_access | check_capillary_glucose
 */
export type TraineeInputInterpretation = {
  status: "pending" | "interpreted" | "unintelligible" | "not_clinical";
  actions: TraineeAction[];
  /** Observações do interpretador — auditoria e debugging. */
  notes?: string;
};

export function createTraineeInput(params: {
  sessionId: string;
  source: TraineeInputSource;
  rawContent: string;
  clinicalTime: number;
}): TraineeInput {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `input-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sessionId: params.sessionId,
    source: params.source,
    rawContent: params.rawContent.trim(),
    timestamp: Date.now(),
    clinicalTime: Math.max(0, Math.floor(params.clinicalTime)),
    interpretation: { status: "pending", actions: [] },
  };
}

/**
 * Ponto de entrada único do pipeline de interpretação (stub desta fase).
 * Fases futuras substituem a implementação sem alterar o contrato nem as chamadas.
 */
export function interpretTraineeInput(input: TraineeInput): TraineeInputInterpretation {
  return {
    status: "pending",
    actions: [],
    notes: `Interpretação estruturada ainda não implementada (origem: ${input.source}).`,
  };
}
