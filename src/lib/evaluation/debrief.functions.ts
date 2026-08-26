/**
 * Fronteira servidor do debriefing (typed RPC).
 * O LLM redige; a avaliação determinística já está decidida no cliente.
 */
import { createServerFn } from "@tanstack/react-start";

import { createLlmProvider } from "@/lib/ai/lovable-gateway.server";
import { generateDebriefingText } from "@/lib/evaluation/debrief.server";
import { debriefRequestSchema } from "@/lib/evaluation/debrief-schema";
import type { SessionEvaluation } from "@/lib/evaluation/evaluation-types";

export const generateDebriefing = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => debriefRequestSchema.parse(data))
  .handler(async ({ data }) => {
    let provider = null;
    try {
      provider = createLlmProvider();
    } catch {
      provider = null;
    }
    return generateDebriefingText(
      provider,
      data.evaluation as unknown as SessionEvaluation,
      data.trainerProfile,
    );
  });
