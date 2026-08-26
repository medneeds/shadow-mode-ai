import { useEffect, useRef } from "react";

import type { ShadowMessage } from "@/lib/shadow/conversation";
import { cn } from "@/lib/utils";

/**
 * TRANSCRIÇÃO AMBIENTE.
 *
 * Um "chat" que se forma ATRÁS da estação: registra a fala do trainee e as
 * respostas/correções de interpretação do Sombra sem nunca competir com a
 * camada superior. É memória visível, não interface de conversa:
 *   - opacidade baixa, tipografia pequena, sem balões nem avatares;
 *   - as linhas mais antigas desaparecem por máscara (fade no topo);
 *   - rola sozinho para a última linha;
 *   - `aria-hidden`: a leitura acessível continua na camada principal.
 */
export function AmbientTranscript({
  messages,
  className,
}: {
  messages: ShadowMessage[];
  className?: string | undefined;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) return null;

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-0 overflow-hidden select-none",
        className,
      )}
      style={{
        maskImage:
          "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.55) 18%, rgba(0,0,0,0.9) 55%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.55) 18%, rgba(0,0,0,0.9) 55%, transparent 100%)",
      }}
    >
      <div className="mx-auto flex h-full max-w-md flex-col justify-end gap-1.5 overflow-hidden px-6 pb-24 pt-16">
        {messages.slice(-14).map((message) => (
          <p
            key={message.id}
            className={cn(
              "max-w-[85%] text-[11px] leading-snug tracking-tight transition-opacity duration-500",
              message.role === "trainee"
                ? "self-end text-right text-foreground/22"
                : "self-start text-left text-foreground/14",
            )}
          >
            {message.text}
          </p>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
