/**
 * Validação de entrada dos server functions do Modo Sombra (client-safe).
 * Mantido fora do arquivo *.functions.ts: aquele arquivo é só declaração de RPC.
 */
import { z } from "zod";

import { trainerProfileIds } from "@/lib/interpreter/interpretation-schema";
import type { ClinicalCaseRuntime } from "@/lib/clinical/clinical-case-types";

export const configSchema = z.object({
  themeId: z.string(),
  levelId: z.enum(["basico", "intermediario", "avancado"]),
  durationId: z.string(),
  shadowOutputMode: z.enum(["text", "voice_text"]),
  traineeInputMode: z.enum(["voice", "text", "hybrid"]),
  voicePreference: z.enum(["female", "male"]),
  trainerProfile: z.enum(trainerProfileIds),
});

export const setupTurnSchema = z.object({
  rawContent: z.string().min(1).max(2000),
  source: z.enum(["voice", "text"]),
  config: configSchema,
  context: z.string().max(4000).optional(),
});

export const clinicalTurnSchema = z.object({
  rawContent: z.string().min(1).max(2000),
  source: z.enum(["voice", "text"]),
  config: configSchema,
  context: z.string().max(4000).optional(),
  clinicalTime: z.number().int().min(0),
  runtime: z.unknown(),
});

export const narrateSchema = z.object({
  facts: z.array(z.string().max(600)).max(8),
  trainerProfile: z.enum(trainerProfileIds),
  context: z.string().max(4000).optional(),
});

/** Somente estado OBSERVÁVEL — nunca diagnóstico, rubrica ou ações esperadas. */
export function visibleStateSummary(runtime: ClinicalCaseRuntime): string {
  const v = runtime.patient.vitals;
  return `consciência=${runtime.patient.consciousness}; via aérea=${runtime.patient.airway}; FC=${v.heartRate}; FR=${v.respiratoryRate}; PA=${v.systolicBP}/${v.diastolicBP}; SpO2=${v.oxygenSaturation}`;
}
