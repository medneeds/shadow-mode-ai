/**
 * Captura de microfone com detecção de atividade de voz (VAD) simples.
 *
 * Regras:
 * - permissão só é pedida por ação explícita do usuário (`start()`);
 * - apenas enunciados FINALIZADOS entram no pipeline clínico;
 * - o stream é encerrado ao desativar, ao sair da sala ou ao desmontar.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { pcmToWav } from "./wav";
import { voiceMessages } from "./voice-types";

export type CaptureStatus =
  | "off" // sem captura (nunca iniciada ou desligada pelo usuário)
  | "starting"
  | "listening"
  | "denied"
  | "unsupported"
  | "error";

type Options = {
  /** Chamado quando um enunciado completo é finalizado. */
  onUtterance: (audio: Blob) => void;
  /** Chamado no início da fala — usado para barge-in. */
  onSpeechStart?: () => void;
  /** Quando true, o áudio capturado é descartado (ex.: Sombra processando). */
  suspended?: boolean;
};

const SILENCE_MS = 900;
const MIN_UTTERANCE_MS = 350;
const MAX_UTTERANCE_MS = 20000;
const SPEECH_THRESHOLD = 0.018;

/**
 * CALIBRAÇÃO DO RITMO — silenciosa, sem controle na interface.
 * Se o usuário volta a falar logo após um enunciado ter sido fechado, ele ainda
 * estava pensando: a janela de silêncio cresce. Se ele sempre encerra e demora,
 * a janela volta lentamente ao padrão. Nada disso altera clínica ou avaliação.
 */
const SILENCE_MIN = 650;
const SILENCE_MAX = 1900;
const RESUME_FAST_MS = 1100;


export function useVoiceCapture({ onUtterance, onSpeechStart, suspended }: Options) {
  const [status, setStatus] = useState<CaptureStatus>("off");
  const [amplitude, setAmplitude] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const nodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const chunksRef = useRef<Float32Array[]>([]);
  const speakingRef = useRef(false);
  const lastVoiceAtRef = useRef(0);
  const startedAtRef = useRef(0);
  const suspendedRef = useRef(Boolean(suspended));
  // Amplitude de alta frequência vive em ref: a visualização lê por quadro,
  // o estado do React é atualizado só o suficiente para UI discreta.
  const amplitudeRef = useRef(0);
  const lastPublishRef = useRef(0);
  const onUtteranceRef = useRef(onUtterance);
  const onSpeechStartRef = useRef(onSpeechStart);
  /** Janela de silêncio adaptada ao ritmo do usuário. */
  const silenceRef = useRef(SILENCE_MS);
  const lastFinalizeAtRef = useRef(0);
  /** Push-to-talk: grava enquanto o gesto estiver ativo, sem VAD. */
  const forcedRef = useRef(false);

  useEffect(() => {
    suspendedRef.current = Boolean(suspended);
    if (suspended) {
      // Ruído durante o processamento não vira novo turno clínico.
      chunksRef.current = [];
      speakingRef.current = false;
    }
  }, [suspended]);

  useEffect(() => {
    onUtteranceRef.current = onUtterance;
    onSpeechStartRef.current = onSpeechStart;
  }, [onUtterance, onSpeechStart]);

  const teardown = useCallback(() => {
    nodeRef.current?.disconnect();
    sourceRef.current?.disconnect();
    nodeRef.current = null;
    sourceRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const ctx = contextRef.current;
    contextRef.current = null;
    if (ctx && ctx.state !== "closed") void ctx.close().catch(() => undefined);
    chunksRef.current = [];
    speakingRef.current = false;
    amplitudeRef.current = 0;
    setAmplitude(0);
  }, []);

  const stop = useCallback(() => {
    teardown();
    setStatus("off");
  }, [teardown]);

  const finalize = useCallback((sampleRate: number) => {
    const chunks = chunksRef.current;
    chunksRef.current = [];
    speakingRef.current = false;
    const durationMs = (chunks.reduce((n, c) => n + c.length, 0) / sampleRate) * 1000;
    if (durationMs < MIN_UTTERANCE_MS) return;
    const blob = pcmToWav(chunks, sampleRate);
    if (blob.size < 2048) return;
    onUtteranceRef.current(blob);
  }, []);

  const start = useCallback(async () => {
    if (streamRef.current) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      setMessage(voiceMessages.micUnsupported);
      return;
    }

    setStatus("starting");
    setMessage(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (error) {
      const name = (error as { name?: string })?.name ?? "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setStatus("denied");
        setMessage(voiceMessages.micDenied);
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setStatus("error");
        setMessage(voiceMessages.micError);
      } else {
        setStatus("error");
        setMessage(voiceMessages.micError);
      }
      return;
    }

    try {
      const AudioCtx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) throw new Error("no_audio_context");
      const ctx = new AudioCtx();
      // iOS Safari exige retomada dentro de um gesto do usuário.
      if (ctx.state === "suspended") await ctx.resume().catch(() => undefined);

      const source = ctx.createMediaStreamSource(stream);
      const node = ctx.createScriptProcessor(4096, 1, 1);

      node.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < input.length; i += 1) sum += input[i]! * input[i]!;
        const rms = Math.sqrt(sum / input.length);
        const level = Math.min(1, rms * 8);
        amplitudeRef.current = level;
        const stamp = performance.now();
        if (stamp - lastPublishRef.current > 200) {
          lastPublishRef.current = stamp;
          setAmplitude(level);
        }

        if (suspendedRef.current) return;

        const now = performance.now();
        if (rms > SPEECH_THRESHOLD) {
          if (!speakingRef.current) {
            speakingRef.current = true;
            startedAtRef.current = now;
            onSpeechStartRef.current?.();
          }
          lastVoiceAtRef.current = now;
          chunksRef.current.push(new Float32Array(input));
          if (now - startedAtRef.current > MAX_UTTERANCE_MS) finalize(ctx.sampleRate);
          return;
        }

        if (speakingRef.current) {
          chunksRef.current.push(new Float32Array(input));
          if (now - lastVoiceAtRef.current > SILENCE_MS) finalize(ctx.sampleRate);
        }
      };

      source.connect(node);
      node.connect(ctx.destination);

      streamRef.current = stream;
      contextRef.current = ctx;
      sourceRef.current = source;
      nodeRef.current = node;
      setStatus("listening");
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      setStatus("error");
      setMessage(voiceMessages.micError);
    }
  }, [finalize]);

  // Nenhum microfone permanece ativo após desmontar o componente.
  useEffect(() => teardown, [teardown]);

  return {
    status,
    amplitude,
    /** Leitura por quadro, sem re-renderização do React. */
    getAmplitude: () => amplitudeRef.current,
    message,
    active: status === "listening",
    start,
    stop,
    clearMessage: () => setMessage(null),
  };
}
