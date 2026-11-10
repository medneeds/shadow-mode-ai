import { useCallback, useEffect, useRef, useState } from "react";
import type { VoicePreference } from "@/lib/shadow-trainer";
import type { SpeechRate } from "./voice-types";
import { streamSpeechResponse } from "./voice-transport";
import { PlaybackSession, PcmDecoder } from "./playback-session";
import { markTurn } from "@/lib/shadow/turn-latency";

export function useShadowSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [failed, setFailed] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const amplitudeRef = useRef(0);
  const activeRef = useRef<PlaybackSession | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  const stop = useCallback(() => {
    activeRef.current?.cancel();
    activeRef.current = null;
    amplitudeRef.current = 0;
    setAmplitude(0);
    setSpeaking(false);
  }, []);

  // Called directly from a gesture; this also unlocks Safari's AudioContext.
  const unlock = useCallback(async () => {
    const AudioCtx = window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    const ctx = ctxRef.current ?? new AudioCtx();
    ctxRef.current = ctx;
    if (ctx.state === "suspended") await ctx.resume();
    return ctx;
  }, []);

  const speak = useCallback(async (params: {
    turnId: string; text: string; voicePreference: VoicePreference; speechRate: SpeechRate;
  }): Promise<boolean> => {
    stop();
    const playback = new PlaybackSession();
    activeRef.current = playback;
    setFailed(false);
    const signal = playback.controller.signal;
    const watchdog = window.setTimeout(() => playback.cancel(), 60000);
    playback.own(() => window.clearTimeout(watchdog));
    markTurn(params.turnId, "ttsRequested");

    // Completion is returned immediately, independently of a stalled network request.
    void (async () => {
      try {
        let ctx: AudioContext | null = null;
        try { ctx = await unlock(); } catch { /* MP3 fallback below */ }
        if (signal.aborted) return;
        if (ctx && ctx.state === "running") {
          let response: Response;
          try { response = await streamSpeechResponse(params, "pcm", signal); }
          catch {
            if (signal.aborted) return;
            response = await streamSpeechResponse(params, "mp3", signal);
          }
          if (response.headers.get("content-type")?.includes("audio/pcm")) {
            const reader = response.body?.getReader();
            if (!reader) throw new Error("empty_audio");
            playback.own(() => { void reader.cancel().catch(() => undefined); });
            const decoder = new PcmDecoder();
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            analyser.connect(ctx.destination);
            playback.own(() => analyser.disconnect());
            const levels = new Uint8Array(analyser.frequencyBinCount);
            let frame = 0;
            let lastPublish = 0;
            const monitor = () => {
              if (signal.aborted) return;
              analyser.getByteTimeDomainData(levels);
              let sum = 0;
              for (const level of levels) sum += ((level - 128) / 128) ** 2;
              amplitudeRef.current = Math.min(1, Math.sqrt(sum / levels.length) * 4);
              if (performance.now() - lastPublish > 200) {
                lastPublish = performance.now(); setAmplitude(amplitudeRef.current);
              }
              frame = requestAnimationFrame(monitor);
            };
            monitor();
            playback.own(() => cancelAnimationFrame(frame));
            let endAt = ctx.currentTime + 0.04;
            let pending = 0;
            let exhausted = false;
            let started = false;
            while (!signal.aborted) {
              // Bound queued PCM to three seconds without dropping or reordering samples.
              while (endAt - ctx.currentTime > 3 && !signal.aborted) {
                await new Promise<void>((resolve) => {
                  const remove = playback.own(resolve);
                  const timer = window.setTimeout(() => { remove(); resolve(); }, 50);
                  playback.own(() => window.clearTimeout(timer));
                });
              }
              if (signal.aborted) return;
              const { value, done } = await reader.read();
              if (done) break;
              const samples = decoder.decode(value);
              if (!samples.length || signal.aborted) continue;
              const buffer = ctx.createBuffer(1, samples.length, 24000);
              buffer.copyToChannel(new Float32Array(samples), 0);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(analyser);
              const remove = playback.own(() => { source.onended = null; try { source.stop(); } catch {} source.disconnect(); });
              pending++;
              source.onended = () => {
                remove(); source.disconnect(); pending--;
                if (exhausted && pending === 0) playback.finish(true);
              };
              endAt = Math.max(endAt, ctx.currentTime + 0.02);
              source.start(endAt);
              endAt += buffer.duration;
              if (!started) {
                started = true;
                markTurn(params.turnId, "audioReady");
                markTurn(params.turnId, "playbackStarted");
                setSpeaking(true);
              }
            }
            exhausted = true;
            if (pending === 0) playback.finish(started);
            return;
          }
          await playMp3(response);
          return;
        }
        await playMp3(await streamSpeechResponse(params, "mp3", signal));
      } catch {
        if (!signal.aborted && activeRef.current === playback) setFailed(true);
        playback.finish(false);
      }
    })();

    async function playMp3(response: Response) {
      const blob = await response.blob();
      if (signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      playback.own(() => {
        audio.onended = null; audio.onerror = null;
        audio.pause(); audio.removeAttribute("src"); audio.load();
        URL.revokeObjectURL(url);
      });
      audio.onended = () => playback.finish(true);
      audio.onerror = () => playback.finish(false);
      markTurn(params.turnId, "audioReady");
      await audio.play();
      if (signal.aborted) { audio.pause(); return; }
      markTurn(params.turnId, "playbackStarted");
      setSpeaking(true);
    }

    const played = await playback.completed;
    if (activeRef.current === playback) {
      activeRef.current = null;
      setSpeaking(false); setAmplitude(0); amplitudeRef.current = 0;
    }
    return played;
  }, [stop, unlock]);

  useEffect(() => () => {
    activeRef.current?.cancel();
    activeRef.current = null;
    const ctx = ctxRef.current;
    ctxRef.current = null;
    if (ctx && ctx.state !== "closed") void ctx.close().catch(() => undefined);
  }, []);

  return { speak, stop, unlock, speaking, amplitude, getAmplitude: () => amplitudeRef.current, failed };
}
