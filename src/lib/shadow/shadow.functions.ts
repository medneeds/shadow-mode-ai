/**
 * Fronteira servidor do Modo Sombra (typed RPC).
 *
 * Pipeline por turno, em UMA ida ao servidor:
 *   TraineeInput → Input Interpreter (LLM) → validação (Zod + catálogo)
 *     → Clinical Case Engine (determinístico) → ClinicalEvents
 *     → Shadow Trainer Engine (LLM, apenas linguagem) → UMA resposta
 *
 * O LLM nunca muta PatientState. O Case Engine nunca conhece provedor de IA.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { referenceCase } from "@/lib/clinical/reference-cases";
import { applyAction, buildAction } from "@/lib/clinical/clinical-case-engine";
import type { ClinicalCaseRuntime } from "@/lib/clinical/clinical-case-types";
import { interpretInput } from "@/lib/interpreter/interpret.server";
import { createLlmProvider } from "@/lib/ai/lovable-gateway.server";
import type { LlmProvider } from "@/lib/ai/provider";
import { composeShadowResponse } from "@/lib/shadow/trainer-engine.server";
import {
  interpretationUnavailableReply,
  unintelligibleReply,
} from "@/lib/shadow/trainer-fallback";
import { trainerProfileIds } from "@/lib/interpreter/interpretation-schema";
import { defaultConfig, type TrainingConfig } from "@/lib/training-session";

const configSchema = z.object({
  themeId: z.string(),
  levelId: z.enum(["basico", "intermediario", "avancado"]),
  durationId: z.string(),
  shadowOutputMode: z.enum(["text", "voice_text"]),
  traineeInputMode: z.enum(["voice", "text", "hybrid"]),
  voicePreference: z.enum(["female", "male"]),
  trainerProfile: z.enum(trainerProfileIds),
});

const setupInput = z.object({
  rawContent: z.string().min(1).max(2000),
  source: z.enum(["voice", "text"]),
  config: configSchema,
  context: z.string().max(4000).optional(),
});

const turnInput = z.object({
  rawContent: z.string().min(1).max(2000),
  source: z.enum(["voice", "text"]),
  config: configSchema,
  context: z.string().max(4000).optional(),
  clinicalTime: z.number().int().min(0),
  runtime: z.unknown(),
});

const narrateInput = z.object({
  facts: z.array(z.string().max(600)).max(8),
  trainerProfile: z.enum(trainerProfileIds),
  context: z.string().max(4000).optional(),
});

function provider(): LlmProvider | null {
  try {
    return createLlmProvider();
  } catch {
    return null;
  }
}

function visibleStateSummary(runtime: ClinicalCaseRuntime): string {
  const v = runtime.patient.vitals;
  return `consciência=${runtime.patient.consciousness}; via aérea=${runtime.patient.airway}; FC=${v.heartRate}; FR=${v.respiratoryRate}; PA=${v.systolicBP}/${v.diastolicBP}; SpO2=${v.oxygenSaturation}`;
}

/** Configuração conversacional: uma chamada de LLM, resposta determinística. */
export const interpretSetupTurn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => setupInput.parse(data))
  .handler(async ({ data }) => {
    const llm = provider();
    if (!llm) {
      return {
        kind: "error" as const,
        configPatch: {} as Partial<TrainingConfig>,
        startSession: false,
        metaCommands: [] as { type: string; value: string | null }[],
        shadowText: interpretationUnavailableReply,
      };
    }

    try {
      const result = await interpretInput(llm, referenceCase, {
        rawContent: data.rawContent,
        source: data.source,
        phase: "pre_station",
        config: data.config as TrainingConfig,
        context: data.context,
      });

      const c = result.configuration;
      const patch: Partial<TrainingConfig> = {};
      if (c.themeId) patch.themeId = c.themeId;
      if (c.levelId) patch.levelId = c.levelId as TrainingConfig["levelId"];
      if (c.durationId) patch.durationId = c.durationId;
      if (c.trainerProfile) patch.trainerProfile = c.trainerProfile;
      if (c.voicePreference) patch.voicePreference = c.voicePreference;
      if (c.shadowOutputMode) patch.shadowOutputMode = c.shadowOutputMode;
      if (c.traineeInputMode) patch.traineeInputMode = c.traineeInputMode;

      return {
        kind: result.kind,
        configPatch: patch,
        startSession: c.startSession,
        metaCommands: result.metaCommands,
        shadowText: result.clarificationQuestion ?? null,
      };
    } catch {
      return {
        kind: "error" as const,
        configPatch: {} as Partial<TrainingConfig>,
        startSession: false,
        metaCommands: [] as { type: string; value: string | null }[],
        shadowText: interpretationUnavailableReply,
      };
    }
  });

/** Estação ativa: interpretação clínica + motor determinístico + fraseado. */
export const runClinicalTurn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => turnInput.parse(data))
  .handler(async ({ data }) => {
    const runtime = data.runtime as ClinicalCaseRuntime;
    const llm = provider();

    if (!llm) {
      return {
        kind: "error" as const,
        runtime,
        actions: [] as { actionId: string }[],
        metaCommands: [] as { type: string; value: string | null }[],
        facts: [] as string[],
        shadowText: interpretationUnavailableReply,
        fallback: true,
      };
    }

    let interpretation;
    try {
      interpretation = await interpretInput(llm, referenceCase, {
        rawContent: data.rawContent,
        source: data.source,
        phase: "active_station",
        config: data.config as TrainingConfig,
        context: data.context,
        visibleState: visibleStateSummary(runtime),
      });
    } catch {
      return {
        kind: "error" as const,
        runtime,
        actions: [] as { actionId: string }[],
        metaCommands: [] as { type: string; value: string | null }[],
        facts: [] as string[],
        shadowText: interpretationUnavailableReply,
        fallback: true,
      };
    }

    // Meta comandos nunca entram no motor clínico nem na pontuação.
    if (interpretation.kind === "meta_command") {
      return {
        kind: "meta_command" as const,
        runtime,
        actions: [] as { actionId: string }[],
        metaCommands: interpretation.metaCommands,
        facts: [] as string[],
        shadowText: null as string | null,
        fallback: false,
      };
    }

    if (interpretation.kind === "clinical_input" && interpretation.actions.length > 0) {
      let next = runtime;
      const facts: string[] = [];
      for (const action of interpretation.actions) {
        const built = buildAction(referenceCase, next, action.actionId, "trainee", Date.now());
        const result = applyAction(next, { ...built, clinicalTime: data.clinicalTime }, referenceCase);
        next = result.runtime;
        result.newEvents.forEach((e) => facts.push(e.fact));
      }

      const composed = await composeShadowResponse(llm, {
        facts,
        profile: data.config.trainerProfile,
        context: data.context,
        traineeInput: data.rawContent,
      });

      return {
        kind: "clinical_input" as const,
        runtime: next,
        actions: interpretation.actions.map((a) => ({ actionId: a.actionId })),
        metaCommands: [] as { type: string; value: string | null }[],
        facts,
        shadowText: composed.text,
        fallback: composed.fallback,
      };
    }

    // Ambíguo / sem ação reconhecida: esclarecer, nunca inferir conduta de alto impacto.
    const clarification = interpretation.clarificationQuestion ?? unintelligibleReply;
    const composed = await composeShadowResponse(llm, {
      facts: [],
      profile: data.config.trainerProfile,
      clarification,
      context: data.context,
      traineeInput: data.rawContent,
    });

    return {
      kind: "ambiguous" as const,
      runtime,
      actions: [] as { actionId: string }[],
      metaCommands: [] as { type: string; value: string | null }[],
      facts: [] as string[],
      shadowText: composed.text,
      fallback: composed.fallback,
    };
  });

/** Fatos gerados pelo tempo (deterioração, resultados) ganham tom do perfil. */
export const narrateClinicalEvents = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => narrateInput.parse(data))
  .handler(async ({ data }) => {
    const composed = await composeShadowResponse(provider(), {
      facts: data.facts,
      profile: data.trainerProfile,
      context: data.context,
    });
    return { shadowText: composed.text, fallback: composed.fallback };
  });

export const shadowDefaultConfig = defaultConfig;
