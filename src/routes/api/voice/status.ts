/**
 * Disponibilidade da voz. Permite ao cliente evitar inicializar infraestrutura
 * de voz quando o provedor não está configurado (modo texto continua íntegro).
 */
import { createFileRoute } from "@tanstack/react-router";

import { voiceAvailability } from "@/lib/voice/elevenlabs.server";

export const Route = createFileRoute("/api/voice/status")({
  server: {
    handlers: {
      GET: () => Response.json(voiceAvailability()),
    },
  },
});
