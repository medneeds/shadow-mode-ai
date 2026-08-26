/**
 * Reprodução da resposta canônica do Sombra.
 *
 * Regras:
 * - nunca gera texto novo para TTS: fala exatamente o texto exibido;
 * - um único fluxo de áudio por vez (turnos antigos são cancelados);
 * - falha de síntese não interrompe a estação (o texto segue visível).
 */
import { useCallback, useEffect, useRef, useState } from "react";

import type { VoicePreference } from "@/lib/shadow-trainer";
import { synthesizeShadowResponse } from "./voice-transport";
import type { SpeechRate } from "./voice-types";

export function useShadowSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [failed, setFailed] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const turnRef = useRef<string | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const releaseAudio = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.src = "";
    }
    audioRef.current = null;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    analyserRef.current = null;
    setAmplitude(0);
  }, []);

  /** Interrompe a fala imediatamente (barge-in ou mudo). */
  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    turnRef.current = null;
    releaseAudio();
    setSpeaking(false);
  }, [releaseAudio]);

  const speak = useCallback(
    async (params: {
      turnId: string;
      text: string;
      voicePreference: VoicePreference;
      speechRate: SpeechRate;
    }) => {
      stop();
      const controller = new AbortController();
      abortRef.current = controller;
      turnRef.current = params.turnId;
      setFailed(false);

      let blob: Blob;
      try {
        blob = await synthesizeShadowResponse(
          {
            text: params.text,
            voicePreference: params.voicePreference,
            speechRate: params.speechRate,
          },
          controller.signal,
        );
      } catch {
        if (turnRef.current === params.turnId) setFailed(true);
        return false;
      }

      // Turno mais novo já começou: descarta resultado obsoleto.
      if (turnRef.current !== params.turnId || controller.signal.aborted) return false;

      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audio.preload = "auto";
      audioRef.current = audio;

      // Amplitude real do áudio alimenta a presença visual (sem waveform/UI extra).
      try {
        const AudioCtx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = ctxRef.current ?? new AudioCtx();
          ctxRef.current = ctx;
          if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
          const source = ctx.createMediaElementSource(audio);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          analyser.connect(ctx.destination);
          analyserRef.current = analyser;
          const data = new Uint8Array(analyser.frequencyBinCount);
          const tick = () => {
            const current = analyserRef.current;
            if (!current) return;
            current.getByteTimeDomainData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i += 1) {
              const v = (data[i]! - 128) / 128;
              sum += v * v;
            }
            setAmplitude(Math.min(1, Math.sqrt(sum / data.length) * 4));
            rafRef.current = requestAnimationFrame(tick);
          };
          rafRef.current = requestAnimationFrame(tick);
        }
      } catch {
        // Sem análise de amplitude: a presença usa animação contida.
      }

      return await new Promise<boolean>((resolve) => {
        audio.onended = () => {
          if (turnRef.current === params.turnId) {
            releaseAudio();
            setSpeaking(false);
            turnRef.current = null;
          }
          resolve(true);
        };
        audio.onerror = () => {
          if (turnRef.current === params.turnId) {
            releaseAudio();
            setSpeaking(false);
            setFailed(true);
          }
          resolve(false);
        };
        audio
          .play()
          .then(() => setSpeaking(true))
          .catch(() => {
            // Autoplay bloqueado (iOS): a resposta permanece em texto.
            setFailed(true);
            setSpeaking(false);
            resolve(false);
          });
      });
    },
    [releaseAudio, stop],
  );

  useEffect(
    () => () => {
      abortRef.current?.abort();
      releaseAudio();
      const ctx = ctxRef.current;
      ctxRef.current = null;
      if (ctx && ctx.state !== "closed") void ctx.close().catch(() => undefined);
    },
    [releaseAudio],
  );

  return { speak, stop, speaking, amplitude, failed };
}
