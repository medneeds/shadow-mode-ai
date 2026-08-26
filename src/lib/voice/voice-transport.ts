/**
 * Transporte HTTP da voz (cliente → nossos endpoints → provedor).
 * O cliente nunca conhece o provedor nem a credencial.
 */
import type { VoicePreference } from "@/lib/shadow-trainer";
import type { SpeechRate, VoiceAvailability } from "./voice-types";

export async function fetchVoiceAvailability(signal?: AbortSignal): Promise<VoiceAvailability> {
  try {
    const response = await fetch("/api/voice/status", signal ? { signal } : {});
    if (!response.ok) return { speechToText: false, textToSpeech: false };
    return (await response.json()) as VoiceAvailability;
  } catch {
    return { speechToText: false, textToSpeech: false };
  }
}

/** Transcreve um áudio completo (WAV) e devolve o transcript FINAL. */
export async function transcribeUtterance(
  audio: Blob,
  signal?: AbortSignal,
): Promise<{ text: string } | { error: string }> {
  const form = new FormData();
  form.append("audio", audio, "utterance.wav");
  const response = await fetch("/api/voice/transcribe", {
    method: "POST",
    body: form,
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    return { error: body.error ?? "stt_failed" };
  }
  return (await response.json()) as { text: string };
}

/** Baixa o áudio da resposta canônica do Sombra. */
export async function synthesizeShadowResponse(
  params: { text: string; voicePreference: VoicePreference; speechRate: SpeechRate },
  signal?: AbortSignal,
): Promise<Blob> {
  const response = await fetch("/api/voice/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) throw new Error(`tts_${response.status}`);
  return response.blob();
}
