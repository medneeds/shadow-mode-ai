/**
 * STT: recebe áudio do trainee e devolve o transcript final.
 * A credencial do provedor permanece no servidor.
 */
import { createFileRoute } from "@tanstack/react-router";

import { createSpeechRecognitionProvider, voiceAvailability } from "@/lib/voice/elevenlabs.server";

const MAX_BYTES = 8 * 1024 * 1024;

export const Route = createFileRoute("/api/voice/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!voiceAvailability().speechToText) {
          return Response.json({ error: "voice_not_configured" }, { status: 503 });
        }

        let audio: File | null = null;
        try {
          const form = await request.formData();
          const value = form.get("audio");
          if (value instanceof File) audio = value;
        } catch {
          return Response.json({ error: "invalid_request" }, { status: 400 });
        }

        if (!audio || audio.size < 2048) {
          return Response.json({ error: "empty_audio" }, { status: 400 });
        }
        if (audio.size > MAX_BYTES) {
          return Response.json({ error: "audio_too_large" }, { status: 413 });
        }

        try {
          const provider = createSpeechRecognitionProvider();
          const { text } = await provider.transcribe({ audio, language: "por" });
          return Response.json({ text });
        } catch (error) {
          console.error("[voice] stt", error);
          return Response.json({ error: "stt_failed" }, { status: 502 });
        }
      },
    },
  },
});
