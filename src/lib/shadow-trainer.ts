/**
 * Shadow Trainer — configuração de interação e arquitetura futura.
 *
 * Separação arquitetural obrigatória:
 * - Case Engine (Phase 03+): verdade clínica, fisiologia, consequências, tempo,
 *   informações disponíveis e ações esperadas.
 * - Shadow Trainer Engine: apenas linguagem, tom, ritmo, tamanho da resposta e
 *   pressão conversacional. Nunca altera a verdade médica do caso.
 *
 * Política de não-dica (no-hint policy) durante estação ativa: o Sombra descreve
 * a realidade clínica e nunca sugere diagnóstico, conduta, exame ou passo omitido.
 */

/**
 * Como o SOMBRA se comunica (saída). Independente da entrada do trainee.
 */
export type ShadowOutputMode = "text" | "voice_text";

/**
 * Como o TRAINEE se comunica (entrada). Independente da saída do Sombra.
 * Todas as combinações são arquiteturalmente válidas.
 */
export type TraineeInputMode = "voice" | "text" | "hybrid";

export type VoicePreference = "female" | "male";
export type TrainerProfile = "gentle" | "assertive" | "fast_paced" | "permissive";

export const shadowOutputModes: {
  id: ShadowOutputMode;
  label: string;
  hint: string;
}[] = [
  { id: "text", label: "Texto", hint: "O Sombra responde apenas por escrito." },
  { id: "voice_text", label: "Voz + texto", hint: "O Sombra fala e exibe o texto." },
];

export const traineeInputModes: {
  id: TraineeInputMode;
  label: string;
  hint: string;
}[] = [
  { id: "voice", label: "Voz", hint: "Conduza o caso falando." },
  { id: "text", label: "Texto", hint: "Digite suas condutas." },
  { id: "hybrid", label: "Voz + texto", hint: "Fale ou digite durante a estação." },
];

/** Voz e texto são apenas transportes: não há penalidade clínica por modalidade. */
export function traineeInputModeLabel(id: TraineeInputMode): string {
  return traineeInputModes.find((m) => m.id === id)?.label ?? "";
}

export function traineeCanSpeak(id: TraineeInputMode): boolean {
  return id === "voice" || id === "hybrid";
}

export function traineeCanType(id: TraineeInputMode): boolean {
  return id === "text" || id === "hybrid";
}

export const voicePreferences: { id: VoicePreference; label: string }[] = [
  { id: "female", label: "Feminina" },
  { id: "male", label: "Masculina" },
];

export const trainerProfiles: {
  id: TrainerProfile;
  label: string;
  hint: string;
  description: string;
}[] = [
  {
    id: "gentle",
    label: "Brando",
    hint: "Calmo e paciente",
    description:
      "Dá tempo razoável para pensar e conduzir o caso, sem aumentar a pressão desnecessariamente.",
  },
  {
    id: "assertive",
    label: "Incisivo",
    hint: "Direto e exigente",
    description: "Comunica mudanças e consequências de forma mais firme. Não oferece dicas clínicas.",
  },
  {
    id: "fast_paced",
    label: "Acelerado",
    hint: "Pressão elevada",
    description:
      "A evolução clínica e os eventos do ambiente toleram menos demora. Não oferece dicas clínicas.",
  },
  {
    id: "permissive",
    label: "Permissivo",
    hint: "Espaço exploratório",
    description:
      "Permite mais exploração conversacional antes de escalar a pressão do ambiente. Não oferece dicas clínicas.",
  },
];

export function shadowOutputModeLabel(id: ShadowOutputMode): string {
  return shadowOutputModes.find((m) => m.id === id)?.label ?? "";
}

export function voicePreferenceLabel(id: VoicePreference): string {
  return voicePreferences.find((v) => v.id === id)?.label ?? "";
}

export function trainerProfileLabel(id: TrainerProfile): string {
  return trainerProfiles.find((p) => p.id === id)?.label ?? "";
}

/** Resumo pt-BR do Sombra: "Voz feminina · Incisivo" ou "Texto · Incisivo". */
export function shadowSummary(
  interactionMode: InteractionMode,
  voicePreference: VoicePreference,
  trainerProfile: TrainerProfile,
): string {
  const left =
    interactionMode === "voice_text"
      ? `Voz ${voicePreferenceLabel(voicePreference).toLowerCase()}`
      : "Texto";
  return `${left} · ${trainerProfileLabel(trainerProfile)}`;
}

/**
 * Tipos de evento clínico previstos para o Case Engine (Phase 03+).
 * Nenhum destes eventos pode ser inventado pelo LLM — todos se originam do caso.
 */
export type ClinicalEventType =
  | "physiologic_deterioration"
  | "improvement_after_treatment"
  | "new_symptom"
  | "vital_signs_change"
  | "lab_result_available"
  | "imaging_result_available"
  | "family_information"
  | "nursing_communication"
  | "specialist_response"
  | "complication"
  | "cardiac_arrest"
  | "stabilization"
  | "disposition";

/**
 * Contrato futuro: um evento clínico gera UMA resposta do Sombra, usada tanto
 * para o texto na tela quanto para a síntese de voz (evita divergência).
 */
export type ClinicalEvent = {
  type: ClinicalEventType;
  /** Fato clínico objetivo, definido pelo Case Engine. */
  fact: string;
  /** Momento (segundos desde o início) em que o evento se tornou verdadeiro. */
  atSecond: number;
};

export type ShadowResponse = {
  /** Texto único: renderizado na UI e enviado ao TTS na Phase 05. */
  text: string;
  eventType?: ClinicalEventType;
};
