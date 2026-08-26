import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { OptionChip, PageSection, SectionHeading } from "@/components/ui/section";
import { durations, levels, themes, type LevelId } from "@/lib/shadow-content";

export const Route = createFileRoute("/treinar")({
  head: () => ({
    meta: [
      { title: "Configurar estação — Shadow Mode" },
      {
        name: "description",
        content: "Escolha tema, nível e duração da sua estação clínica no Shadow Mode.",
      },
      { property: "og:title", content: "Configurar estação — Shadow Mode" },
      {
        property: "og:description",
        content: "Defina tema, nível e duração antes de entrar no Modo Sombra.",
      },
    ],
  }),
  component: TrainingSetup,
});

function TrainingSetup() {
  const [theme, setTheme] = useState<string>("emergencia");
  const [level, setLevel] = useState<LevelId>("intermediario");
  const [duration, setDuration] = useState<string>("15");

  const selectedTheme = themes.find((t) => t.id === theme)?.label ?? "";
  const selectedLevel = levels.find((l) => l.id === level)?.label ?? "";
  const selectedDuration = durations.find((d) => d.id === duration)?.label ?? "";

  return (
    <AppShell>
      <PageSection className="pb-6">
        <SectionHeading
          eyebrow="Treinar"
          title="Configurar estação"
          description="Prévia da configuração. Nesta versão os casos ainda não são gerados — a estação entra em modo de demonstração."
        />
      </PageSection>

      <PageSection className="py-0">
        <fieldset>
          <legend className="eyebrow">Tema</legend>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {themes.map((t) => (
              <OptionChip
                key={t.id}
                label={t.label}
                hint={t.hint}
                selected={theme === t.id}
                onSelect={() => setTheme(t.id)}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-12">
          <legend className="eyebrow">Nível</legend>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {levels.map((l) => (
              <OptionChip
                key={l.id}
                label={l.label}
                hint={l.audience}
                selected={level === l.id}
                emphasis={l.id === "avancado"}
                onSelect={() => setLevel(l.id)}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-12">
          <legend className="eyebrow">Duração da estação</legend>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {durations.map((d) => (
              <OptionChip
                key={d.id}
                label={d.label}
                hint={d.hint}
                selected={duration === d.id}
                onSelect={() => setDuration(d.id)}
              />
            ))}
          </div>
        </fieldset>
      </PageSection>

      <PageSection>
        <div className="panel flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">Sua estação</p>
            <p className="mt-2 font-display text-lg">
              {selectedTheme} · {selectedLevel} · {selectedDuration}
            </p>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
              Você conduzirá o atendimento por voz. Nenhuma lista de tarefas será exibida durante a
              estação.
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/modo-sombra">Entrar no Modo Sombra</Link>
          </Button>
        </div>
      </PageSection>
    </AppShell>
  );
}
