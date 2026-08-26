/**
 * Contratos de domínio da camada de voz (Phase 05).
 *
 * Voz é APENAS transporte:
 *   MICROFONE → STT → TraineeInput(source="voice") → Input Interpreter
 *     → Clinical Case Engine → Shadow Trainer Engine → UMA resposta canônica
 *       → TEXTO (UI)  e  VOZ (TTS)
 *
 * Nenhum arquivo de domínio (motor clínico, treinador, sessão, UI) importa
 * ElevenLabs. O provedor entra apenas pelos adaptadores em `*.server.ts`.
 */
import type { VoicePreference } from "@/lib/shadow-trainer";

/** Ritmo da síntese — conceito independente do perfil do treinador. */
export type SpeechRate = "slower" | "normal" | "faster";

export const speechRates: { id: SpeechRate; label: string }[] = [
  { id: "slower", label: "Mais lenta" },
  { id: "normal", label: "Normal" },
  { id: "faster", label: "Mais rápida" },
];

export function speechRateLabel(id: SpeechRate): string {
  return speechRates.find((r) => r.id === id)?.label ?? "";
}

/** Reconhecimento de fala (STT). Recebe apenas áudio do trainee. */
export type SpeechRecognitionProvider = {
  transcribe(input: {
    audio: Blob | File;
    /** ISO-639 conforme provedor; o adaptador normaliza. */
    language?: string;
  }): Promise<{ text: string }>;
};

/** Síntese de fala (TTS). Recebe apenas a resposta canônica do Sombra. */
export type SpeechSynthesisProvider = {
  synthesize(input: {
    text: string;
    voicePreference: VoicePreference;
    speechRate: SpeechRate;
  }): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string }>;
};

export type VoiceProvider = {
  recognition: SpeechRecognitionProvider | null;
  synthesis: SpeechSynthesisProvider | null;
};

/** O que a camada de voz consegue oferecer neste ambiente. */
export type VoiceAvailability = {
  speechToText: boolean;
  textToSpeech: boolean;
};

export class VoiceUnavailableError extends Error {}

export const voiceMessages = {
  micDenied: "Não consegui acessar o microfone. Você pode continuar digitando.",
  micUnsupported: "Este navegador não permite captura de áudio. Continue digitando.",
  micError: "A captura de áudio falhou. Você pode continuar digitando.",
  sttFailed: "Não consegui transcrever sua fala. Tente novamente ou digite.",
  ttsFailed: "A voz do Sombra está indisponível agora. A resposta segue em texto.",
  notConfigured: "A voz ainda não está configurada neste ambiente. Continue digitando.",
} as const;
