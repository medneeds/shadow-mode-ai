/**
 * TTS: sintetiza EXATAMENTE o texto canônico da resposta do Sombra.
 * Nenhum conteúdo clínico oculto é enviado ao provedor de voz.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { createSpeechSynthesisProvider, voiceAvailability } from "@/lib/voice/elevenlabs.server";

const bodySchema = z.object({
  text: z.string().trim().min(1).max(2000),
  voicePreference: z.enum(["female", "male"]),
  speechRate: z.enum(["slower", "normal", "faster"]).default("normal"),
});

export const Route = createFileRoute("/api/voice/speak")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!voiceAvailability().textToSpeech) {
          return Response.json({ error: "voice_not_configured" }, { status: 503 });
        }

        let parsed;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch {
          return Response.json({ error: "invalid_request" }, { status: 400 });
        }

        try {
          const provider = createSpeechSynthesisProvider();
          const { stream, contentType } = await provider.synthesize(parsed);
          return new Response(stream, {
            headers: { "Content-Type": contentType, "Cache-Control": "no-store" },
          });
        } catch (error) {
          console.error("[voice] tts", error);
          return Response.json({ error: "tts_failed" }, { status: 502 });
        }
      },
    },
  },
});
