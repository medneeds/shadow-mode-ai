import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

export type VoiceState = "idle" | "listening" | "processing" | "speaking" | "paused" | "finished";

/** Rótulos acessíveis — a comunicação visual é feita pelo círculo, não por texto grande. */
export const voiceStateLabels: Record<VoiceState, string> = {
  idle: "Pronto",
  listening: "Ouvindo",
  processing: "Processando",
  speaking: "Sombra falando",
  paused: "Pausado",
  finished: "Estação encerrada",
};

/**
 * PRESENÇA DO SOMBRA — círculo + ondas vivas.
 *
 * Arquitetura:
 * - o SVG é atualizado dentro de um único requestAnimationFrame local, por
 *   mutação direta de atributos: nenhuma re-renderização do React por quadro;
 * - a amplitude REAL chega por `getAmplitude()` (referência de alta frequência)
 *   ou por `amplitude` (fallback). Nunca há onda energética sem áudio real:
 *   em `processing`, `idle` e `paused` o movimento é interno e declarado.
 * - todo estado é interpolado (média móvel exponencial), então transições —
 *   inclusive barge-in — são contínuas, sem troca abrupta de animação.
 */
export function VoicePresence({
  state = "idle",
  amplitude = 0,
  getAmplitude,
  pace = 1,
  className,
}: {
  state?: VoiceState;
  amplitude?: number;
  /** Leitura por referência da amplitude real (microfone ou playback). */
  getAmplitude?: () => number;
  /** Ritmo do perfil do treinador (0.85–1.2). Nunca altera a leitura clínica. */
  pace?: number;
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const layerRefs = useRef<(SVGPathElement | null)[]>([]);
  const coreRef = useRef<SVGCircleElement | null>(null);
  const glowRef = useRef<SVGCircleElement | null>(null);

  const stateRef = useRef(state);
  const paceRef = useRef(pace);
  const ampPropRef = useRef(amplitude);
  const getAmpRef = useRef(getAmplitude);

  stateRef.current = state;
  paceRef.current = pace;
  ampPropRef.current = amplitude;
  getAmpRef.current = getAmplitude;

  const reducedRef = useRef(false);

  // Movimento contínuo desligado: o estado segue legível por luminosidade.
  useEffect(() => {
    if (!reducedRef.current) return;
    const target = STATE_TARGETS[state];
    coreRef.current?.setAttribute("opacity", String(target.core));
    glowRef.current?.setAttribute("opacity", String(target.glow));
  }, [state]);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    reducedRef.current = Boolean(reduced);

    if (reduced) {
      for (const [index, layer] of layerRefs.current.entries()) {
        const config = LAYERS[index];
        if (layer && config) layer.setAttribute("d", wavePath(config, 1, 0, 0));
      }
      const target = STATE_TARGETS[stateRef.current];
      coreRef.current?.setAttribute("opacity", String(target.core));
      glowRef.current?.setAttribute("opacity", String(target.glow));
      return;
    }

    let raf = 0;
    let visualAmp = 0;
    let visualScale = 1;
    let visualCore = STATE_TARGETS[stateRef.current].core;
    let visualGlow = STATE_TARGETS[stateRef.current].glow;
    let phase = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(64, now - last) / 1000;
      last = now;

      const current = stateRef.current;
      const target = STATE_TARGETS[current];
      const speedPace = paceRef.current;

      // FONTE DE AMPLITUDE explícita: real ao ouvir/falar, sintética ao pensar.
      const real = clamp(getAmpRef.current?.() ?? ampPropRef.current);
      const targetAmp =
        current === "listening" || current === "speaking"
          ? target.ampFloor + real * target.ampGain
          : current === "processing"
            ? target.ampFloor + 0.35 * (0.5 + 0.5 * Math.sin(now / 420))
            : current === "idle"
              ? target.ampFloor * (0.7 + 0.3 * Math.sin(now / 2600))
              : target.ampFloor;

      // Subida rápida (reação verdadeira), descida suave (nunca violento).
      const k = targetAmp > visualAmp ? 0.22 : 0.09;
      visualAmp += (targetAmp - visualAmp) * k;
      visualScale += (target.scale - visualScale) * 0.06;
      visualCore += (target.core - visualCore) * 0.07;
      visualGlow += (target.glow - visualGlow) * 0.07;

      phase += dt * target.speed * speedPace;

      for (const [index, layer] of layerRefs.current.entries()) {
        const config = LAYERS[index];
        if (!layer || !config) continue;
        layer.setAttribute("d", wavePath(config, visualScale, visualAmp, phase));
        layer.setAttribute(
          "opacity",
          (config.opacity * (0.5 + 0.5 * visualCore) * (0.65 + visualAmp * 0.5)).toFixed(3),
        );
      }

      coreRef.current?.setAttribute("opacity", visualCore.toFixed(3));
      coreRef.current?.setAttribute("r", (CORE_R * (0.985 + visualAmp * 0.035)).toFixed(2));
      glowRef.current?.setAttribute("opacity", (visualGlow * (0.7 + visualAmp * 0.6)).toFixed(3));

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className={cn(
        "presence-field relative flex items-center justify-center",
        "size-[clamp(13rem,52vw,20rem)]",
        className,
      )}
    >
      <svg
        ref={svgRef}
        viewBox="-100 -100 200 200"
        className="animate-spectral size-full overflow-visible"
        aria-hidden
      >
        <defs>
          <radialGradient id="shadow-core" cx="50%" cy="42%" r="62%">
            <stop offset="0%" stopColor="var(--voice-cyan)" stopOpacity="0.34" />
            <stop offset="52%" stopColor="var(--voice-indigo)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--voice-blue)" stopOpacity="0.04" />
          </radialGradient>
          <linearGradient id="shadow-wave-1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--voice-cyan)" />
            <stop offset="100%" stopColor="var(--voice-indigo)" />
          </linearGradient>
          <linearGradient id="shadow-wave-2" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--voice-indigo)" />
            <stop offset="100%" stopColor="var(--voice-violet)" />
          </linearGradient>
          <linearGradient id="shadow-wave-3" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--voice-blue)" />
            <stop offset="100%" stopColor="var(--voice-violet)" />
          </linearGradient>
        </defs>

        <circle ref={glowRef} r="66" fill="url(#shadow-core)" opacity="0.5" />

        {LAYERS.map((layer, index) => (
          <path
            key={layer.id}
            ref={(node) => {
              layerRefs.current[index] = node;
            }}
            d={wavePath(layer, 1, 0, 0)}
            fill="none"
            stroke={`url(#${layer.stroke})`}
            strokeWidth={layer.width}
            strokeLinecap="round"
            opacity={layer.opacity}
          />
        ))}

        <circle
          ref={coreRef}
          r={CORE_R}
          fill="none"
          stroke="var(--voice-cyan)"
          strokeWidth="0.9"
          opacity="0.55"
        />
      </svg>

      {/* O estado permanece disponível para leitores de tela, sem UI textual. */}
      <p role="status" aria-live="polite" className="sr-only">
        Presença do Sombra: {voiceStateLabels[state]}
      </p>
    </div>
  );
}

const CORE_R = 44;
const POINTS = 72;

type Layer = {
  id: string;
  stroke: string;
  radius: number;
  lobes: number;
  gain: number;
  drift: number;
  width: number;
  opacity: number;
};

/** Três camadas sutis, cada uma com fase, velocidade e opacidade próprias. */
const LAYERS: Layer[] = [
  { id: "l1", stroke: "shadow-wave-1", radius: 52, lobes: 3, gain: 9, drift: 1, width: 1.1, opacity: 0.9 },
  { id: "l2", stroke: "shadow-wave-2", radius: 62, lobes: 4, gain: 13, drift: -0.66, width: 0.9, opacity: 0.55 },
  { id: "l3", stroke: "shadow-wave-3", radius: 74, lobes: 5, gain: 17, drift: 0.4, width: 0.7, opacity: 0.3 },
];

type StateTarget = {
  /** Amplitude mínima do movimento próprio do estado. */
  ampFloor: number;
  /** Quanto da amplitude real de áudio é convertida em onda. */
  ampGain: number;
  /** Contração (para dentro) ou projeção (para fora) do campo. */
  scale: number;
  speed: number;
  core: number;
  glow: number;
};

const STATE_TARGETS: Record<VoiceState, StateTarget> = {
  idle: { ampFloor: 0.1, ampGain: 0, scale: 1, speed: 0.18, core: 0.5, glow: 0.42 },
  listening: { ampFloor: 0.12, ampGain: 0.9, scale: 1.04, speed: 0.32, core: 0.78, glow: 0.6 },
  processing: { ampFloor: 0.16, ampGain: 0, scale: 0.86, speed: 0.75, core: 0.66, glow: 0.5 },
  speaking: { ampFloor: 0.16, ampGain: 1, scale: 1.1, speed: 0.42, core: 1, glow: 0.9 },
  paused: { ampFloor: 0.02, ampGain: 0, scale: 0.97, speed: 0.05, core: 0.32, glow: 0.2 },
  finished: { ampFloor: 0.04, ampGain: 0, scale: 0.95, speed: 0.08, core: 0.38, glow: 0.26 },
};

function clamp(value: number) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

/** Circunferência deformada por senoides — som atravessando o espaço, não equalizador. */
function wavePath(layer: Layer, scale: number, amp: number, phase: number) {
  const base = layer.radius * scale;
  // Termo de forma constante: as camadas nunca são círculos perfeitos,
  // mesmo em silêncio — a amplitude real apenas expande o que já é orgânico.
  const gain = layer.gain * (0.28 + amp * 0.9);
  let d = "";
  for (let i = 0; i <= POINTS; i += 1) {
    const theta = (i / POINTS) * Math.PI * 2;
    const p = phase * layer.drift;
    const r =
      base +
      gain * Math.sin(layer.lobes * theta + p * 2.4) * 0.7 +
      gain * Math.sin((layer.lobes + 2) * theta - p * 1.5) * 0.3;
    const x = Math.cos(theta) * r;
    const y = Math.sin(theta) * r;
    d += `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${d}Z`;
}
