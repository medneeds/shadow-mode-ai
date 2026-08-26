/**
 * Contrato de saída estruturada do Input Interpreter (client-safe).
 *
 * O LLM só pode devolver ESTE formato. Nada de roteamento livre:
 *  - kind decide para onde a entrada vai;
 *  - actionId é restrito ao catálogo do caso atual (validado abaixo);
 *  - nada aqui contém verdade clínica (vitais, resultados, diagnóstico).
 */
import { z } from "zod";

import { durations, levels, themes } from "@/lib/shadow-content";

export const themeIds = themes.map((t) => t.id) as [string, ...string[]];
export const levelIds = levels.map((l) => l.id) as [string, ...string[]];
export const durationIds = durations.map((d) => d.id) as [string, ...string[]];
export const trainerProfileIds = ["gentle", "assertive", "fast_paced", "permissive"] as const;
export const voicePreferenceIds = ["female", "male"] as const;
export const shadowOutputModeIds = ["text", "voice_text"] as const;
export const traineeInputModeIds = ["voice", "text", "hybrid"] as const;
export const metaCommandTypes = [
  "pause_session",
  "resume_session",
  "finish_session",
  "change_input_mode",
  "change_shadow_output_mode",
  "change_voice",
  "change_trainer_profile",
  "change_speech_rate",
] as const;

export const emotionalTones = [
  "neutral",
  "tense",
  "frustrated",
  "distracted",
  "confident",
] as const;

export const interpretationSchema = z.object({
  kind: z.enum([
    "configuration_intent",
    "meta_command",
    "clinical_input",
    "relational",
    "ambiguous",
  ]),
  /** Leitura de tom — usada só para linguagem, nunca para verdade clínica. */
  emotionalTone: z.enum(emotionalTones).nullable(),
  /** Verdadeiro quando a fala saiu do eixo do treino (desabafo, meta-conversa). */
  offTrack: z.boolean(),
  configuration: z.object({
    themeId: z.enum(themeIds).nullable(),
    levelId: z.enum(levelIds).nullable(),
    durationId: z.enum(durationIds).nullable(),
    trainerProfile: z.enum(trainerProfileIds).nullable(),
    voicePreference: z.enum(voicePreferenceIds).nullable(),
    shadowOutputMode: z.enum(shadowOutputModeIds).nullable(),
    traineeInputMode: z.enum(traineeInputModeIds).nullable(),
    startSession: z.boolean(),
  }),
  metaCommands: z.array(
    z.object({
      type: z.enum(metaCommandTypes),
      value: z.string().nullable(),
    }),
  ),
  actions: z.array(
    z.object({
      actionId: z.string(),
      sourceExcerpt: z.string().nullable(),
      /** Confiança semântica (0..1). Baixa confiança + alto impacto = esclarecer. */
      confidence: z.number().min(0).max(1),
      /** Valor numérico/dose finalmente pretendido, quando dito (ex.: "250 ml"). */
      value: z.string().nullable(),
    }),
  ),
  clarificationQuestion: z.string().nullable(),
  reason: z.string().nullable(),
});

export type Interpretation = z.infer<typeof interpretationSchema>;

/** JSON Schema estrito equivalente — o catálogo de ações entra como enum. */
export function buildInterpretationJsonSchema(allowedActionIds: string[]): Record<string, unknown> {
  const nullableEnum = (values: readonly string[]) => ({
    type: ["string", "null"],
    enum: [...values, null],
  });

  return {
    type: "object",
    additionalProperties: false,
    required: [
      "kind",
      "emotionalTone",
      "offTrack",
      "configuration",
      "metaCommands",
      "actions",
      "clarificationQuestion",
      "reason",
    ],
    properties: {
      kind: {
        type: "string",
        enum: [
          "configuration_intent",
          "meta_command",
          "clinical_input",
          "relational",
          "ambiguous",
        ],
      },
      emotionalTone: nullableEnum(emotionalTones),
      offTrack: { type: "boolean" },
      configuration: {
        type: "object",
        additionalProperties: false,
        required: [
          "themeId",
          "levelId",
          "durationId",
          "trainerProfile",
          "voicePreference",
          "shadowOutputMode",
          "traineeInputMode",
          "startSession",
        ],
        properties: {
          themeId: nullableEnum(themeIds),
          levelId: nullableEnum(levelIds),
          durationId: nullableEnum(durationIds),
          trainerProfile: nullableEnum(trainerProfileIds),
          voicePreference: nullableEnum(voicePreferenceIds),
          shadowOutputMode: nullableEnum(shadowOutputModeIds),
          traineeInputMode: nullableEnum(traineeInputModeIds),
          startSession: { type: "boolean" },
        },
      },
      metaCommands: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["type", "value"],
          properties: {
            type: { type: "string", enum: [...metaCommandTypes] },
            value: { type: ["string", "null"] },
          },
        },
      },
      actions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["actionId", "sourceExcerpt", "confidence", "value"],
          properties: {
            actionId:
              allowedActionIds.length > 0
                ? { type: "string", enum: allowedActionIds }
                : { type: "string" },
            sourceExcerpt: { type: ["string", "null"] },
            confidence: { type: "number" },
            value: { type: ["string", "null"] },
          },
        },
      },
      clarificationQuestion: { type: ["string", "null"] },
      reason: { type: ["string", "null"] },
    },
  };
}
