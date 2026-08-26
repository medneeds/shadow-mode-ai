import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, MicOff } from "lucide-react";

import { useVoiceCapture } from "@/lib/voice/use-voice-capture";
import { useShadowSpeech } from "@/lib/voice/use-shadow-speech";
import { fetchVoiceAvailability, transcribeUtterance } from "@/lib/voice/voice-transport";
import { voiceMessages, type VoiceAvailability } from "@/lib/voice/voice-types";
import { traineeCanSpeak } from "@/lib/shadow-trainer";
import type { TraineeInputSource } from "@/lib/trainee-input";

import { AppShell } from "@/components/layout/AppShell";
import { VoicePresence } from "@/components/shadow/VoicePresence";
import { Button } from "@/components/ui/button";
import { OptionChip, PageSection, SectionHeading } from "@/components/ui/section";
import { durations, levels, themes, type LevelId } from "@/lib/shadow-content";
import { useTrainingSession } from "@/lib/session-store";
import {
  shadowOutputModes,
  traineeInputModes,
  trainerProfiles,
  voicePreferences,
} from "@/lib/shadow-trainer";
import {
  configSecondaryLine,
  configSummary,
  nextSetupQuestion,
  setupOpeningQuestion,
} from "@/lib/shadow/setup-flow";
import { recentContext } from "@/lib/shadow/conversation";
import { interpretSetupTurn } from "@/lib/shadow/shadow.functions";
import { pageTitle } from "@/lib/brand";

export const Route = createFileRoute("/treinar")({
  head: () => ({
    meta: [
      { title: pageTitle("Configurar estação") },
      {
        name: "description",
        content: "Diga em uma frase o que você quer treinar. O Sombra monta a estação.",
      },
      { property: "og:title", content: pageTitle("Configurar estação") },
      {
        property: "og:description",
        content: "Configuração conversacional da estação clínica no Modo Sombra.",
      },
    ],
  }),
  component: TrainingSetup,
});

function TrainingSetup() {
  const navigate = useNavigate();
  const { config, setConfig, providedFields, startSession, setupMessages, addSetupMessage } =
    useTrainingSession();
  const interpret = useServerFn(interpretSetupTurn);

  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [availability, setAvailability] = useState<VoiceAvailability | null>(null);
  const openedRef = useRef(false);
  const busyRef = useRef(false);
  const turnRef = useRef(0);

  const speech = useShadowSpeech();
  const wantsVoiceInput = traineeCanSpeak(config.traineeInputMode);
  const wantsVoiceOutput = config.shadowOutputMode === "voice_text";

  useEffect(() => {
    if (openedRef.current || setupMessages.length > 0) return;
    openedRef.current = true;
    addSetupMessage("shadow", setupOpeningQuestion);
  }, [setupMessages.length, addSetupMessage]);

  useEffect(() => {
    if (!wantsVoiceInput && !wantsVoiceOutput) return;
    const controller = new AbortController();
    void fetchVoiceAvailability(controller.signal).then((result) => {
      if (!controller.signal.aborted) setAvailability(result);
    });
    return () => controller.abort();
  }, [wantsVoiceInput, wantsVoiceOutput]);

  const handleStart = () => {
    speech.stop();
    startSession();
    void navigate({ to: "/modo-sombra" });
  };

  /** Mesma voz e mesmo ritmo da estação — a configuração já é a experiência. */
  const sayShadow = useCallback(
    (text: string) => {
      addSetupMessage("shadow", text);
      if (!wantsVoiceOutput || !availability?.textToSpeech) return;
      const turnId = turnRef.current + 1;
      turnRef.current = turnId;
      void speech.speak({
        turnId: `setup-${turnId}`,
        text,
        voicePreference: config.voicePreference,
        speechRate: config.speechRate,
      });
    },
    [
      addSetupMessage,
      wantsVoiceOutput,
      availability?.textToSpeech,
      speech,
      config.voicePreference,
      config.speechRate,
    ],
  );

  const send = async (rawContent: string, source: TraineeInputSource = "text") => {
    const content = rawContent.trim();
    if (!content || busyRef.current) return;
    speech.stop();
    addSetupMessage("trainee", content);
    busyRef.current = true;
    setBusy(true);
    try {
      const result = await interpret({
        data: {
          rawContent: content,
          source,
          config,
          context: recentContext(setupMessages),
        },
      });

      const patchedFields = Object.keys(result.configPatch);
      if (patchedFields.length > 0) setConfig(result.configPatch);

      const provided = Array.from(
        new Set([...providedFields, ...patchedFields]),
      ) as typeof providedFields;
      const question = nextSetupQuestion(provided);

      if (result.shadowText) {
        addSetupMessage("shadow", result.shadowText);
      } else if (question) {
        addSetupMessage("shadow", question);
      } else {
        addSetupMessage("shadow", "Pronto. Podemos começar quando você quiser.");
      }

      if (result.startSession && !question) {
        startSession();
        void navigate({ to: "/modo-sombra" });
      }
    } catch {
      addSetupMessage("shadow", "Não consegui entender agora. Pode dizer de outra forma?");
    } finally {
      setBusy(false);
    }
  };

  const lastShadow = [...setupMessages].reverse().find((m) => m.role === "shadow");
  const earlier = setupMessages.slice(-4, -1);
  const question = nextSetupQuestion(providedFields);

  return (
    <AppShell>
      <PageSection>
        <SectionHeading
          eyebrow="Treinar"
          title="O que vamos treinar?"
          description="Diga em uma frase. O Sombra monta a estação — você só ajusta se quiser."
        />

        <div className="mt-10 flex flex-col items-center text-center">
          {earlier.length > 0 && (
            <div className="mb-5 flex max-w-md flex-col gap-1">
              {earlier.map((m) => (
                <p key={m.id} className="truncate text-xs text-muted-foreground/50">
                  {m.text}
                </p>
              ))}
            </div>
          )}

          <VoicePresence state={busy ? "processing" : "listening"} />

          <p aria-live="polite" className="mt-6 max-w-lg font-display text-xl leading-relaxed">
            {lastShadow?.text ?? setupOpeningQuestion}
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="mt-8 flex w-full max-w-md items-end gap-2 rounded-2xl border border-hairline bg-surface/70 px-3 py-2 focus-within:border-moss/50"
          >
            <label className="sr-only" htmlFor="config-fala">
              Descreva a estação
            </label>
            <textarea
              id="config-fala"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              disabled={busy}
              placeholder="Ex.: emergência, avançado, 15 minutos"
              className="max-h-24 flex-1 resize-none bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              aria-label="Enviar"
              disabled={busy || !draft.trim()}
              className="mb-1 flex size-9 shrink-0 items-center justify-center rounded-full border border-moss/50 text-foreground transition-colors hover:bg-surface-raised disabled:opacity-40"
            >
              <ArrowUp aria-hidden className="size-4" />
            </button>
          </form>

          <div className="mt-8 w-full max-w-md rounded-xl border border-hairline bg-surface p-4 text-left">
            <p className="eyebrow">Sua estação</p>
            <p className="mt-2 font-display text-base">{configSummary(config)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{configSecondaryLine(config)}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button size="sm" onClick={handleStart} disabled={busy}>
                Entrar no Modo Sombra
              </Button>
              <button
                type="button"
                onClick={() => setShowAdjust((v) => !v)}
                className="rounded-md px-1 text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                {showAdjust ? "Ocultar ajustes" : "Ajustar"}
              </button>
            </div>
            {question && (
              <p className="mt-3 text-xs text-muted-foreground/70">
                Ainda posso ajustar pelo que você disser: {question.toLowerCase()}
              </p>
            )}
          </div>
        </div>
      </PageSection>

      {showAdjust && (
        <PageSection className="pt-0">
          <div className="border-t border-hairline pt-10">
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

            <fieldset className="mt-10">
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

            <fieldset className="mt-10">
              <legend className="eyebrow">Duração</legend>
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

            <fieldset className="mt-10">
              <legend className="eyebrow">Perfil do treinador</legend>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                O perfil muda o tom e o ritmo. Não altera o caso, a conduta correta nem a avaliação
                — e o Sombra nunca dá dicas durante a estação.
              </p>
            </fieldset>

            <fieldset className="mt-10">
              <legend className="eyebrow">Respostas do Sombra</legend>
              <div className="mt-4 grid gap-6 sm:grid-cols-2">
                <div className="grid grid-cols-2 gap-3">
                  {shadowOutputModes.map((m) => (
                    <OptionChip
                      key={m.id}
                      label={m.label}
                      hint={m.hint}
                      selected={config.shadowOutputMode === m.id}
                      onSelect={() => setConfig({ shadowOutputMode: m.id })}
                    />
                  ))}
                </div>
                {config.shadowOutputMode === "voice_text" && (
                  <div className="grid grid-cols-2 gap-3">
                    {voicePreferences.map((v) => (
                      <OptionChip
                        key={v.id}
                        label={v.label}
                        selected={config.voicePreference === v.id}
                        onSelect={() => setConfig({ voicePreference: v.id })}
                      />
                    ))}
                  </div>
                )}
              </div>
            </fieldset>

            <fieldset className="mt-10">
              <legend className="eyebrow">Suas respostas</legend>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {traineeInputModes.map((m) => (
                  <OptionChip
                    key={m.id}
                    label={m.label}
                    hint={m.hint}
                    selected={config.traineeInputMode === m.id}
                    onSelect={() => setConfig({ traineeInputMode: m.id })}
                  />
                ))}
              </div>
              <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted-foreground">
                Falar ou digitar não muda sua avaliação. A devolutiva considera conteúdo,
                prioridade, tempo e sequência — nunca a forma de responder.
              </p>
            </fieldset>
          </div>
        </PageSection>
      )}
    </AppShell>
  );
}
