/**
 * Validação da fronteira do debriefing. A avaliação chega pronta do cliente
 * porque ela é determinística: o servidor não recalcula nem altera nota.
 */
import { z } from "zod";

export const debriefRequestSchema = z.object({
  trainerProfile: z.enum(["gentle", "assertive", "fast_paced", "permissive"]),
  evaluation: z.object({
    overallScore: z.number().int().min(0).max(100),
    bandLabel: z.string(),
    headline: z.string(),
    outcome: z.string(),
    categories: z.array(
      z.object({
        label: z.string(),
        score: z.number(),
        maxScore: z.number(),
        percentage: z.number(),
      }),
    ),
    strengths: z.array(z.string()),
    misses: z.array(z.string()),
    criticalIssues: z.array(z.string()),
    improvements: z.array(z.string()),
  }),
});

export type DebriefRequest = z.infer<typeof debriefRequestSchema>;
