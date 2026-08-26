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
import { matchDeterministicActions } from "@/lib/interpreter/speech-normalization";
import { createLlmProvider } from "@/lib/ai/lovable-gateway.server";
import type { LlmProvider } from "@/lib/ai/provider";
import { composeShadowResponse } from "@/lib/shadow/trainer-engine.server";
import { interpretationUnavailableReply, unintelligibleReply } from "@/lib/shadow/trainer-fallback";
import {
  buildInteractionContext,
  serializeInteractionContext,
} from "@/lib/shadow/interaction-context";
import { composeFastPathResponse, isFastPathEligible } from "@/lib/shadow/response-fast-path";
import { toSpeechText } from "@/lib/shadow/speech-text";
import {
  clinicalTurnSchema,
  narrateSchema,
  setupTurnSchema,
  visibleStateSummary,
} from "@/lib/shadow/shadow-turn-schemas";
import type { TrainingConfig } from "@/lib/training-session";

type MetaCommandDto = { type: string; value: string | null };

/** Categorias em que uma interpretação incerta não pode virar ação executada. */
const highImpactCategories = new Set(["medication", "procedure"]);
const CONFIDENCE_FLOOR = 0.55;

function optionalProvider(): LlmProvider | null {
  try {
    return createLlmProvider();
  } catch {
    return null;
  }
}

function speech(text: string | null): string | null {
  return text ? toSpeechText(text) : null;
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
      speechText: speech(interpretationUnavailableReply),
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

      // Fala relacional na configuração: o Sombra responde à pessoa.
      let shadowText = result.clarificationQuestion;
      if (result.kind === "relational") {
        const composed = await composeShadowResponse(llm, {
          facts: [],
          profile: (patch.trainerProfile ?? data.config.trainerProfile) as TrainingConfig["trainerProfile"],
          context: data.context,
          traineeInput: data.rawContent,
          relational: {
            tone: result.emotionalTone ?? "neutral",
            offTrack: result.offTrack,
            inStation: false,
          },
        });
        shadowText = composed.text;
      }

      return {
        kind: result.kind,
        configPatch: patch,
        startSession: c.startSession,
        metaCommands: result.metaCommands as MetaCommandDto[],
        shadowText,
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

    const structuredContext = serializeInteractionContext(
      buildInteractionContext({ def: referenceCase, runtime, conversation: data.context }),
    );

    /** Aplica ações no motor determinístico e devolve os fatos emitidos. */
    const runActions = (actionIds: string[]) => {
      let next = runtime;
      const facts: string[] = [];
      for (const actionId of actionIds) {
        const built = buildAction(referenceCase, next, actionId, "trainee", Date.now());
        const result = applyAction(
          next,
          { ...built, clinicalTime: data.clinicalTime },
          referenceCase,
        );
        next = result.runtime;
        result.newEvents.forEach((event) => facts.push(event.fact));
      }
      return { next, facts };
    };

    const llm = optionalProvider();

    // Caminho rápido de ENTRADA: fala curta e inequívoca não precisa do modelo.
    const deterministicIds = matchDeterministicActions(
      data.rawContent,
      referenceCase.actions.map((a) => a.id),
    );
    if (deterministicIds) {
      const { next, facts } = runActions(deterministicIds);
      if (isFastPathEligible(facts)) {
        const text = composeFastPathResponse(facts, data.config.trainerProfile);
        return {
          kind: "clinical_input" as const,
          runtime: next,
          actions: deterministicIds.map((actionId) => ({ actionId })),
          metaCommands: [] as MetaCommandDto[],
          facts,
          shadowText: text as string | null,
          speechText: speech(text),
          fallback: false,
        };
      }
      if (llm) {
        const composed = await composeShadowResponse(llm, {
          facts,
          profile: data.config.trainerProfile,
          context: data.context,
          structuredContext,
          traineeInput: data.rawContent,
        });
        return {
          kind: "clinical_input" as const,
          runtime: next,
          actions: deterministicIds.map((actionId) => ({ actionId })),
          metaCommands: [] as MetaCommandDto[],
          facts,
          shadowText: composed.text as string | null,
          speechText: speech(composed.text),
          fallback: composed.fallback,
        };
      }
    }

    if (!llm) {
      return {
        ...base,
        kind: "error" as const,
        shadowText: interpretationUnavailableReply as string | null,
        speechText: speech(interpretationUnavailableReply),
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
        structuredContext,
        visibleState: visibleStateSummary(runtime),
      });
    } catch {
      return {
        ...base,
        kind: "error" as const,
        shadowText: interpretationUnavailableReply as string | null,
        speechText: speech(interpretationUnavailableReply),
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
        speechText: null as string | null,
        fallback: false,
      };
    }

    // Limiar de confiança: incerteza em conduta de alto impacto vira esclarecimento.
    const uncertainHighImpact = interpretation.actions.find((a) => {
      const category = referenceCase.actions.find((c) => c.id === a.actionId)?.category;
      return (
        a.confidence < CONFIDENCE_FLOOR && category && highImpactCategories.has(category)
      );
    });

    if (interpretation.kind === "clinical_input" && !uncertainHighImpact) {
      const confident = interpretation.actions.filter((a) => a.confidence >= 0.35);
      if (confident.length > 0) {
        const { next, facts } = runActions(confident.map((a) => a.actionId));

        // Fatos simples são comunicados sem uma segunda ida ao modelo.
        if (isFastPathEligible(facts)) {
          const text = composeFastPathResponse(facts, data.config.trainerProfile);
          return {
            kind: "clinical_input" as const,
            runtime: next,
            actions: confident.map((a) => ({ actionId: a.actionId })),
            metaCommands: [] as MetaCommandDto[],
            facts,
            shadowText: text as string | null,
            speechText: speech(text),
            fallback: false,
          };
        }

        const composed = await composeShadowResponse(llm, {
          facts,
          profile: data.config.trainerProfile,
          context: data.context,
          structuredContext,
          traineeInput: data.rawContent,
        });

        return {
          kind: "clinical_input" as const,
          runtime: next,
          actions: confident.map((a) => ({ actionId: a.actionId })),
          metaCommands: [] as MetaCommandDto[],
          facts,
          shadowText: composed.text as string | null,
          speechText: speech(composed.text),
          fallback: composed.fallback,
        };
      }
    }

    // Relacional: responder à pessoa, sem tocar no motor clínico nem na pontuação.
    if (interpretation.kind === "relational") {
      const composed = await composeShadowResponse(llm, {
        facts: [],
        profile: data.config.trainerProfile,
        context: data.context,
        structuredContext,
        traineeInput: data.rawContent,
        relational: {
          tone: interpretation.emotionalTone ?? "neutral",
          offTrack: interpretation.offTrack,
          inStation: true,
        },
      });
      return {
        ...base,
        kind: "relational" as const,
        shadowText: composed.text as string | null,
        speechText: speech(composed.text),
        fallback: composed.fallback,
      };
    }

    // Ambíguo: esclarecer a intenção, nunca inferir conduta de alto impacto.
    const clarification =
      uncertainHighImpact && interpretation.clarificationQuestion === null
        ? "Confirma essa conduta? Não entendi com segurança."
        : (interpretation.clarificationQuestion ?? unintelligibleReply);

    const composed = await composeShadowResponse(llm, {
      facts: [],
      profile: data.config.trainerProfile,
      clarification,
      context: data.context,
      structuredContext,
      traineeInput: data.rawContent,
    });

    return {
      ...base,
      kind: "ambiguous" as const,
      shadowText: composed.text as string | null,
      speechText: speech(composed.text),
      fallback: composed.fallback,
    };
  });

/** Fatos gerados pelo tempo (deterioração, resultados) ganham tom do perfil. */
export const narrateClinicalEvents = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => narrateSchema.parse(data))
  .handler(async ({ data }) => {
    // Fatos simples do relógio clínico não precisam de modelo generativo.
    if (isFastPathEligible(data.facts)) {
      const text = composeFastPathResponse(data.facts, data.trainerProfile);
      return { shadowText: text, speechText: toSpeechText(text), fallback: false };
    }
    const composed = await composeShadowResponse(optionalProvider(), {
      facts: data.facts,
      profile: data.trainerProfile,
      context: data.context,
    });
    return {
      shadowText: composed.text,
      speechText: toSpeechText(composed.text),
      fallback: composed.fallback,
    };
  });
