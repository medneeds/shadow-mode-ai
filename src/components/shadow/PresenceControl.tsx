import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Camada de GESTOS sobre a presença do Sombra.
 *
 * A esfera é o controle principal — o rodapé de botões vira redundância.
 *
 *   toque simples ........ interromper a fala do Sombra (ou ação primária)
 *   toque duplo .......... ligar/desligar o microfone
 *   segurar .............. falar enquanto segura (push-to-talk)
 *   segurar em silêncio .. pausar/retomar a estação
 *
 * Nada aqui conhece clínica: os gestos apenas disparam callbacks da rota.
 */
const HOLD_MS = 260;
const DOUBLE_TAP_MS = 280;
const PAUSE_ARM_MS = 1200;
const SPEECH_LEVEL = 0.06;

export function PresenceControl({
  children,
  onTap,
  onDoubleTap,
  onHoldStart,
  onHoldEnd,
  onSilentHold,
  getAmplitude,
  hint,
  label = "Esfera do Sombra",
  disabled,
  className,
}: {
  children: ReactNode;
  /** Ação primária: interromper a fala ou confirmar. */
  onTap?: () => void;
  /** Liga/desliga o microfone. */
  onDoubleTap?: () => void;
  /** Início do push-to-talk. */
  onHoldStart?: () => void;
  /** Fim do push-to-talk. `canceled` = o gesto virou outra coisa. */
  onHoldEnd?: (canceled: boolean) => void;
  /** Segurou sem falar: pausar/retomar. */
  onSilentHold?: () => void;
  /** Amplitude real — decide se o hold foi fala ou silêncio. */
  getAmplitude?: () => number;
  /** Dica curta exibida abaixo da esfera quando ociosa. */
  hint?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [gesture, setGesture] = useState<"none" | "holding" | "pause-armed">("none");

  const holdTimer = useRef<number | null>(null);
  const tapTimer = useRef<number | null>(null);
  const ampTimer = useRef<number | null>(null);
  const holdingRef = useRef(false);
  const spokeRef = useRef(false);
  const pauseArmedRef = useRef(false);
  const downAtRef = useRef(0);

  const clearTimers = useCallback(() => {
    for (const ref of [holdTimer, tapTimer, ampTimer]) {
      if (ref.current) window.clearTimeout(ref.current);
      if (ref === ampTimer && ref.current) window.clearInterval(ref.current);
      ref.current = null;
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const endHold = useCallback(() => {
    holdingRef.current = false;
    if (ampTimer.current) {
      window.clearInterval(ampTimer.current);
      ampTimer.current = null;
    }
    const silent = pauseArmedRef.current && !spokeRef.current;
    pauseArmedRef.current = false;
    setGesture("none");
    onHoldEnd?.(silent);
    if (silent) onSilentHold?.();
  }, [onHoldEnd, onSilentHold]);

  const handleDown = () => {
    if (disabled) return;
    downAtRef.current = performance.now();
    spokeRef.current = false;
    pauseArmedRef.current = false;

    holdTimer.current = window.setTimeout(() => {
      holdingRef.current = true;
      setGesture("holding");
      onHoldStart?.();

      // Observa a amplitude real durante o hold: fala vira push-to-talk,
      // silêncio prolongado arma a pausa (e o rótulo avisa antes de soltar).
      ampTimer.current = window.setInterval(() => {
        if ((getAmplitude?.() ?? 0) > SPEECH_LEVEL) spokeRef.current = true;
        if (
          !spokeRef.current &&
          !pauseArmedRef.current &&
          performance.now() - downAtRef.current > PAUSE_ARM_MS
        ) {
          pauseArmedRef.current = true;
          setGesture("pause-armed");
        }
      }, 90) as unknown as number;
    }, HOLD_MS);
  };

  const handleUp = () => {
    if (disabled) return;
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }

    if (holdingRef.current) {
      endHold();
      return;
    }

    // Toque: espera a janela do toque duplo antes de resolver.
    if (tapTimer.current) {
      window.clearTimeout(tapTimer.current);
      tapTimer.current = null;
      onDoubleTap?.();
      return;
    }
    tapTimer.current = window.setTimeout(() => {
      tapTimer.current = null;
      onTap?.();
    }, DOUBLE_TAP_MS) as unknown as number;
  };

  const handleCancel = () => {
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    if (holdingRef.current) endHold();
  };

  const gestureHint =
    gesture === "pause-armed"
      ? "Solte para pausar"
      : gesture === "holding"
        ? "Falando — solte para enviar"
        : hint;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`${label}. Toque duplo liga o microfone, segure para falar.`}
        aria-disabled={disabled}
        onPointerDown={handleDown}
        onPointerUp={handleUp}
        onPointerCancel={handleCancel}
        onPointerLeave={handleCancel}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter") {
            e.preventDefault();
            onTap?.();
          }
          if (e.key === " ") {
            e.preventDefault();
            onDoubleTap?.();
          }
        }}
        className={cn(
          "touch-none select-none rounded-full outline-none transition-transform duration-200",
          "focus-visible:ring-2 focus-visible:ring-foreground/30",
          !disabled && "cursor-pointer",
          gesture === "holding" && "scale-[1.03]",
          gesture === "pause-armed" && "scale-[0.97] opacity-80",
        )}
      >
        {children}
      </div>

      {gestureHint && (
        <p
          className={cn(
            "mt-1 text-[11px] transition-colors",
            gesture === "none" ? "text-muted-foreground/50" : "text-foreground/80",
          )}
          aria-live="polite"
        >
          {gestureHint}
        </p>
      )}
    </div>
  );
}
