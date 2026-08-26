import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { OptionChip, PageSection, SectionHeading } from "@/components/ui/section";
import { durations, levels, themes, type LevelId } from "@/lib/shadow-content";
import { useTrainingSession } from "@/lib/session-store";
import { durationLabel, levelLabel, themeLabel } from "@/lib/training-session";
import {
  shadowOutputModes,
  shadowSummary,
  traineeInputModes,
  traineeSummary,
  trainerProfiles,
  voicePreferences,
} from "@/lib/shadow-trainer";
import { pageTitle } from "@/lib/brand";

export const Route = createFileRoute("/treinar")({
  head: () => ({
    meta: [
      { title: pageTitle("Configurar estação") },
      {
        name: "description",
        content: "Escolha tema, nível, duração e como você e o Sombra vão se comunicar.",
      },
      { property: "og:title", content: pageTitle("Configurar estação") },
      {
        property: "og:description",
        content: "Defina tema, nível e duração antes de entrar no Modo Sombra.",
      },
    ],
  }),
  component: TrainingSetup,
});

function TrainingSetup() {
  const navigate = useNavigate();
  const { config, setConfig, startSession } = useTrainingSession();
  const [step, setStep] = useState<"configuring" | "review">("configuring");

  const summary = `${themeLabel(config.themeId)} · ${levelLabel(config.levelId)} · ${durationLabel(
    config.durationId,
  )}`;
  const shadowLine = shadowSummary(
    config.interactionMode,
    config.voicePreference,
    config.trainerProfile,
  );

  const handleStart = () => {
    startSession();
    void navigate({ to: "/modo-sombra" });
  };

  if (step === "review") {
    return (
      <AppShell>
        <PageSection>
          <SectionHeading
            eyebrow="Revisar estação"
            title="Sua estação"
            description="Confira a configuração antes de entrar no Modo Sombra."
          />

          <div className="panel mt-8 max-w-xl p-6">
            <dl className="divide-y divide-[color:var(--hairline)]">
              {[
                { label: "Tema", value: themeLabel(config.themeId) },
                { label: "Nível", value: levelLabel(config.levelId) },
                { label: "Duração", value: durationLabel(config.durationId) },
              ].map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-6 py-3">
                  <dt className="text-sm text-muted-foreground">{row.label}</dt>
                  <dd className="font-display text-base">{row.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 rounded-lg border border-hairline bg-surface p-4">
              <p className="eyebrow">Sombra</p>
              <p className="mt-2 font-display text-base">{shadowLine}</p>
            </div>

            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              Ao iniciar, o cronômetro começa e você assume a condução do caso.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={handleStart}>
                Iniciar estação
              </Button>
              <Button size="lg" variant="ghost" onClick={() => setStep("configuring")}>
                Alterar configuração
              </Button>
            </div>
          </div>
        </PageSection>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageSection className="pb-6">
        <SectionHeading
          eyebrow="Treinar"
          title="Configurar estação"
          description="Escolha tema, nível e duração. Você conduzirá o atendimento por voz."
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
                selected={config.themeId === t.id}
                onSelect={() => setConfig({ themeId: t.id })}
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
                selected={config.levelId === l.id}
                emphasis={l.id === "avancado"}
                onSelect={() => setConfig({ levelId: l.id as LevelId })}
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
                selected={config.durationId === d.id}
                onSelect={() => setConfig({ durationId: d.id })}
              />
            ))}
          </div>
        </fieldset>
      </PageSection>

      <PageSection className="pb-0">
        <fieldset className="border-t border-hairline pt-10">
          <legend className="eyebrow">Sombra</legend>

          <div className="mt-4 grid gap-8 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Interação</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {interactionModes.map((m) => (
                  <OptionChip
                    key={m.id}
                    label={m.label}
                    hint={m.hint}
                    selected={config.interactionMode === m.id}
                    onSelect={() => setConfig({ interactionMode: m.id })}
                  />
                ))}
              </div>
            </div>

            {config.interactionMode === "voice_text" && (
              <div>
                <p className="text-sm text-muted-foreground">Voz</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {voicePreferences.map((v) => (
                    <OptionChip
                      key={v.id}
                      label={v.label}
                      selected={config.voicePreference === v.id}
                      onSelect={() => setConfig({ voicePreference: v.id })}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8">
            <p className="text-sm text-muted-foreground">Perfil</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {trainerProfiles.map((p) => (
                <OptionChip
                  key={p.id}
                  label={p.label}
                  hint={p.hint}
                  selected={config.trainerProfile === p.id}
                  onSelect={() => setConfig({ trainerProfile: p.id })}
                />
              ))}
            </div>
            <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted-foreground">
              O perfil muda o tom e o ritmo da simulação. Não altera a conduta médica correta nem o
              caso clínico — e o Sombra nunca dá dicas durante a estação.
            </p>
          </div>
        </fieldset>
      </PageSection>

      <PageSection>
        <div className="panel flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">Sua estação</p>
            <p className="mt-2 font-display text-lg">{summary}</p>
            <p className="mt-1 text-sm text-muted-foreground">Sombra · {shadowLine}</p>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
              Você conduzirá o atendimento por voz. Nenhuma lista de tarefas será exibida durante a
              estação.
            </p>
          </div>
          <Button size="lg" onClick={() => setStep("review")}>
            Revisar estação
          </Button>
        </div>
      </PageSection>
    </AppShell>
  );
}
