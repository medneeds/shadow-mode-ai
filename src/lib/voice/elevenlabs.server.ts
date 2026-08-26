/**
 * Adaptador ElevenLabs — primeira implementação dos contratos de voz.
 * Server-only: a credencial nunca chega ao navegador.
 *
 * Fronteira de segurança clínica: o provedor de voz recebe SOMENTE
 * - áudio do trainee (STT);
 * - o texto canônico da resposta do Sombra (TTS).
 * Nunca diagnóstico oculto, rubrica, ações esperadas ou estado do paciente.
 */
import type { VoicePreference } from "@/lib/shadow-trainer";
import {
  VoiceUnavailableError,
  type SpeechRate,
  type SpeechRecognitionProvider,
  type SpeechSynthesisProvider,
  type VoiceAvailability,
} from "./voice-types";

const API = "https://api.elevenlabs.io";

/** IDs de voz ficam FORA do domínio — apenas aqui, com override por ambiente. */
const defaultVoiceIds: Record<VoicePreference, string> = {
  female: "pFZP5JQG7iQjIQuC4Bku", // Lily — compatível com pt-BR (multilingual)
  male: "JBFqnCBsd6RMkjVDRZzb", // George — compatível com pt-BR (multilingual)
};

function voiceId(preference: VoicePreference): string {
  const override =
    preference === "female"
      ? process.env["ELEVENLABS_VOICE_ID_FEMALE"]
      : process.env["ELEVENLABS_VOICE_ID_MALE"];
  return override && override.trim() ? override.trim() : defaultVoiceIds[preference];
}

/** slower / normal / faster → `speed` suportado pelo provedor (0.7–1.2). */
const speedByRate: Record<SpeechRate, number> = {
  slower: 0.9,
  normal: 1.0,
  faster: 1.1,
};

function apiKey(): string {
  const key = process.env["ELEVENLABS_API_KEY"] ?? "";
  if (!key.trim()) {
    throw new VoiceUnavailableError("ELEVENLABS_API_KEY ausente no ambiente do servidor.");
  }
  return key.trim();
}

export function voiceAvailability(): VoiceAvailability {
  const configured = Boolean((process.env["ELEVENLABS_API_KEY"] ?? "").trim());
  return { speechToText: configured, textToSpeech: configured };
}

function sttModel(): string {
  return process.env["ELEVENLABS_STT_MODEL"] ?? "scribe_v2";
}

function ttsModel(): string {
  return process.env["ELEVENLABS_TTS_MODEL"] ?? "eleven_turbo_v2_5";
}

export function createSpeechRecognitionProvider(): SpeechRecognitionProvider {
  const key = apiKey();
  return {
    async transcribe({ audio, language = "por" }) {
      const form = new FormData();
      form.append("file", audio, "utterance.wav");
      form.append("model_id", sttModel());
      form.append("language_code", language);

      const response = await fetch(`${API}/v1/speech-to-text`, {
        method: "POST",
        headers: { "xi-api-key": key },
        body: form,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`ElevenLabs STT falhou [${response.status}]: ${body}`);
      }

      const data = (await response.json()) as { text?: string };
      return { text: (data.text ?? "").trim() };
    },
  };
}

export function createSpeechSynthesisProvider(): SpeechSynthesisProvider {
  const key = apiKey();
  return {
    async synthesize({ text, voicePreference, speechRate }) {
      const id = voiceId(voicePreference);
      const response = await fetch(
        `${API}/v1/text-to-speech/${id}/stream?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: { "xi-api-key": key, "Content-Type": "application/json" },
          body: JSON.stringify({
            // Texto canônico do Sombra, sem reescrita de conteúdo clínico.
            text,
            model_id: ttsModel(),
            voice_settings: {
              stability: 0.45,
              similarity_boost: 0.75,
              use_speaker_boost: true,
              speed: speedByRate[speechRate],
            },
          }),
        },
      );

      if (!response.ok || !response.body) {
        const body = await response.text().catch(() => "");
        throw new Error(`ElevenLabs TTS falhou [${response.status}]: ${body}`);
      }

      return { stream: response.body, contentType: "audio/mpeg" };
    },
  };
}
