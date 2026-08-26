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
import {
  clinicalTurnSchema,
  narrateSchema,
  setupTurnSchema,
  visibleStateSummary,
} from "@/lib/shadow/shadow-turn-schemas";
import type { TrainingConfig } from "@/lib/training-session";

type MetaCommandDto = { type: string; value: string | null };

function optionalProvider(): LlmProvider | null {
  try {
    return createLlmProvider();
  } catch {
    return null;
  }
}

/** Configuração conversacional: uma chamada de LLM, respostas determinísticas. */
export const interpretSetupTurn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => setupTurnSchema.parse(data))
  .handler(async ({ data }) => {
    const empty = {
      kind: "error" as const,
      configPatch: {} as Partial<TrainingConfig>,
      startSession: false,
      metaCommands: [] as MetaCommandDto[],
      shadowText: interpretationUnavailableReply as string | null,
    };

    const llm = optionalProvider();
    if (!llm) return empty;

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
        metaCommands: result.metaCommands as MetaCommandDto[],
        shadowText: result.clarificationQuestion,
      };
    } catch {
      return empty;
    }
  });

/** Estação ativa: interpretação clínica + motor determinístico + fraseado. */
export const runClinicalTurn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => clinicalTurnSchema.parse(data))
  .handler(async ({ data }) => {
    const runtime = data.runtime as ClinicalCaseRuntime;
    const base = {
      runtime,
      actions: [] as { actionId: string }[],
      metaCommands: [] as MetaCommandDto[],
      facts: [] as string[],
    };

    const llm = optionalProvider();
    if (!llm) {
      return {
        ...base,
        kind: "error" as const,
        shadowText: interpretationUnavailableReply as string | null,
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
        ...base,
        kind: "error" as const,
        shadowText: interpretationUnavailableReply as string | null,
        fallback: true,
      };
    }

    // Meta comandos nunca entram no motor clínico nem na pontuação.
    if (interpretation.kind === "meta_command") {
      return {
        ...base,
        kind: "meta_command" as const,
        metaCommands: interpretation.metaCommands as MetaCommandDto[],
        shadowText: null as string | null,
        fallback: false,
      };
    }

    if (interpretation.kind === "clinical_input" && interpretation.actions.length > 0) {
      let next = runtime;
      const facts: string[] = [];
      for (const action of interpretation.actions) {
        const built = buildAction(referenceCase, next, action.actionId, "trainee", Date.now());
        const result = applyAction(
          next,
          { ...built, clinicalTime: data.clinicalTime },
          referenceCase,
        );
        next = result.runtime;
        result.newEvents.forEach((event) => facts.push(event.fact));
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
        metaCommands: [] as MetaCommandDto[],
        facts,
        shadowText: composed.text as string | null,
        fallback: composed.fallback,
      };
    }

    // Ambíguo: esclarecer a intenção, nunca inferir conduta de alto impacto.
    const composed = await composeShadowResponse(llm, {
      facts: [],
      profile: data.config.trainerProfile,
      clarification: interpretation.clarificationQuestion ?? unintelligibleReply,
      context: data.context,
      traineeInput: data.rawContent,
    });

    return {
      ...base,
      kind: "ambiguous" as const,
      shadowText: composed.text as string | null,
      fallback: composed.fallback,
    };
  });

/** Fatos gerados pelo tempo (deterioração, resultados) ganham tom do perfil. */
export const narrateClinicalEvents = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => narrateSchema.parse(data))
  .handler(async ({ data }) => {
    const composed = await composeShadowResponse(optionalProvider(), {
      facts: data.facts,
      profile: data.trainerProfile,
      context: data.context,
    });
    return { shadowText: composed.text, fallback: composed.fallback };
  });
