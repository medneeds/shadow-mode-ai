import { Mic, MicOff } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Microfone visível ao lado do campo de texto.
 * O gesto na esfera continua existindo; este botão garante que a voz seja
 * DESCOBERTA por quem chega pela primeira vez.
 */
export function ComposerMic({
  active,
  starting,
  onToggle,
  disabled,
  className,
}: {
  active: boolean;
  starting?: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const label = active ? "Desligar microfone" : "Falar — ligar microfone";
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "mb-1 flex size-11 shrink-0 items-center justify-center rounded-full border border-hairline text-muted-foreground/70 transition-all duration-200",
        "hover:border-foreground/25 hover:bg-surface-raised/60 hover:text-foreground active:scale-95",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/40",
        active && "border-foreground/35 bg-surface-raised/70 text-foreground",
        starting && "animate-pulse",
        disabled && "opacity-40",
        className,
      )}
    >
      {active ? <Mic aria-hidden className="size-5" /> : <MicOff aria-hidden className="size-5" />}
      {active && <span className="sr-only">Ouvindo</span>}
    </button>
  );
}
