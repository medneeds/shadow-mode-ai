import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, SlidersHorizontal } from "lucide-react";

import { useVoiceCapture } from "@/lib/voice/use-voice-capture";
import { useShadowSpeech } from "@/lib/voice/use-shadow-speech";
import { fetchVoiceAvailability, transcribeUtterance } from "@/lib/voice/voice-transport";
import { voiceMessages, type VoiceAvailability } from "@/lib/voice/voice-types";
import { traineeCanSpeak } from "@/lib/shadow-trainer";
import type { TraineeInputSource } from "@/lib/trainee-input";

import { AppShell } from "@/components/layout/AppShell";
import { VoicePresence } from "@/components/shadow/VoicePresence";
import { PresenceControl } from "@/components/shadow/PresenceControl";
import { SetupChips } from "@/components/shadow/SetupChips";
import { ComposerMic } from "@/components/shadow/ComposerMic";
import { QuickStations, type QuickStation } from "@/components/shadow/QuickStations";
import { OnboardingFlow } from "@/components/shadow/OnboardingFlow";
import {
  loadDoctorProfile,
  profileDefaults,
  type DoctorProfile,
} from "@/lib/profile/doctor-profile";
import { Button } from "@/components/ui/button";
import { OptionChip, PageSection } from "@/components/ui/section";
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
import { toSpeechText } from "@/lib/shadow/speech-text";
import { cn } from "@/lib/utils";
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
  const [onboarding, setOnboarding] = useState<"unknown" | "open" | "done">("unknown");
  const [showMicHint, setShowMicHint] = useState(true);
  const openedRef = useRef(false);
  const busyRef = useRef(false);
  const turnRef = useRef(0);

  const speech = useShadowSpeech();
  const wantsVoiceInput = traineeCanSpeak(config.traineeInputMode);
  const wantsVoiceOutput = config.shadowOutputMode === "voice_text";

  /** Primeiro acesso: conhecer o médico antes de treinar com ele. */
  useEffect(() => {
    const stored = loadDoctorProfile();
    if (stored) {
      setConfig(profileDefaults(stored));
      setOnboarding("done");
      return;
    }
    setOnboarding(setupMessages.length > 0 ? "done" : "open");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishOnboarding = (profile: DoctorProfile) => {
    setConfig(profileDefaults(profile));
    setOnboarding("done");
  };

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

  const handleQuickStation = (station: QuickStation) => {
    speech.stop();
    setConfig(station.patch);
    startSession();
    void navigate({ to: "/modo-sombra" });
  };

  /** Mesma voz e mesmo ritmo da estação — a configuração já é a experiência. */
  const sayShadow = useCallback(
    (text: string, speechText?: string | null) => {
      addSetupMessage("shadow", text);
      if (!wantsVoiceOutput || !availability?.textToSpeech) return;
      const turnId = turnRef.current + 1;
      turnRef.current = turnId;
      void speech.speak({
        turnId: `setup-${turnId}`,
        text: speechText || toSpeechText(text),
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
        sayShadow(result.shadowText, result.speechText);
      } else if (question) {
        sayShadow(question);
      } else {
        sayShadow("Pronto. Podemos começar quando você quiser.");
      }

      if (result.startSession && !question) {
        startSession();
        void navigate({ to: "/modo-sombra" });
      }
    } catch {
      sayShadow("Não consegui entender agora. Pode dizer de outra forma?");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const handleUtterance = useCallback(
    async (audio: Blob) => {
      if (busyRef.current) return;
      const result = await transcribeUtterance(audio).catch(() => ({ error: "stt_failed" }));
      if ("error" in result) {
        setVoiceNotice(
          result.error === "voice_not_configured"
            ? voiceMessages.notConfigured
            : voiceMessages.sttFailed,
        );
        return;
      }
      if (!result.text.trim()) return;
      setVoiceNotice(null);
      await send(result.text, "voice");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config, setupMessages, providedFields],
  );

  const capture = useVoiceCapture({
    onUtterance: (audio) => void handleUtterance(audio),
    onSpeechStart: () => speech.stop(),
    suspended: busy,
  });

  const micFailed =
    capture.status === "denied" || capture.status === "error" || capture.status === "unsupported";
  const voiceInputBroken = micFailed || availability?.speechToText === false;

  const lastShadow = [...setupMessages].reverse().find((m) => m.role === "shadow");
  const earlier = setupMessages.slice(-4, -1);
  const question = nextSetupQuestion(providedFields);
  const ready = question === null;

  const micFailedEarly =
    capture.status === "denied" || capture.status === "error" || capture.status === "unsupported";
  const canUseVoice = wantsVoiceInput && !(micFailedEarly || availability?.speechToText === false);

  const toggleMic = () => {
    setVoiceNotice(null);
    if (capture.active || capture.status === "starting") capture.stop();
    else void capture.start();
  };

  if (onboarding === "open") {
    return (
      <AppShell>
        <PageSection>
          <OnboardingFlow onComplete={finishOnboarding} onSkip={() => setOnboarding("done")} />
        </PageSection>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageSection>
        <div className="grid gap-10 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] xl:gap-20">
        <div className="flex flex-col items-center text-center xl:items-start xl:text-left">
          {earlier.length > 0 && (
            <p className="mb-4 line-clamp-1 max-w-md text-xs text-muted-foreground/40">
              {earlier[earlier.length - 1]?.text}
            </p>
          )}

          <PresenceControl
            onTap={() => (ready ? handleStart() : speech.stop())}
            onDoubleTap={canUseVoice ? toggleMic : undefined}
            onHoldStart={canUseVoice ? () => void capture.holdStart() : undefined}
            onHoldEnd={canUseVoice ? (canceled) => capture.holdEnd(canceled) : undefined}
            getAmplitude={() => capture.getAmplitude()}
            hint={
              ready
                ? "Toque para entrar no Modo Sombra"
                : canUseVoice
                  ? capture.active
                    ? "Ouvindo — toque duplo desliga o microfone"
                    : "Toque duplo liga o microfone · segure para falar"
                  : undefined
            }
          >
            <VoicePresence
              state={
                speech.speaking
                  ? "speaking"
                  : busy
                    ? "processing"
                    : capture.active
                      ? "listening"
                      : "idle"
              }
              getAmplitude={() =>
                speech.speaking
                  ? speech.getAmplitude()
                  : capture.active
                    ? capture.getAmplitude()
                    : 0
              }
            />
          </PresenceControl>

          <p aria-live="polite" className="mt-2 max-w-lg font-display text-xl leading-relaxed">
            {lastShadow?.text ?? setupOpeningQuestion}
          </p>

          {(voiceNotice ?? capture.message) && (
            <p className="mt-3 text-[11px] text-muted-foreground" aria-live="polite">
              {voiceNotice ?? capture.message}
            </p>
          )}


          <form
            onSubmit={(e) => {
              e.preventDefault();
              const content = draft;
              setDraft("");
              void send(content);
            }}
            className="mt-6 flex w-full max-w-md items-end gap-2 border-b border-hairline pb-1 focus-within:border-moss/50"
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
                  const content = draft;
                  setDraft("");
                  void send(content);
                }
              }}
              rows={1}
              disabled={busy}
              placeholder="Escreva ou fale…"
              className="max-h-24 flex-1 resize-none bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none disabled:opacity-50"
            />
            {canUseVoice && (
              <ComposerMic
                active={capture.active}
                starting={capture.status === "starting"}
                onToggle={() => {
                  setShowMicHint(false);
                  toggleMic();
                }}
                disabled={busy}
              />
            )}
            <button
              type="submit"
              aria-label="Enviar"
              disabled={busy || !draft.trim()}
              className={cn(
                "mb-1 flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground/50 transition-all duration-200 active:scale-95",
                draft.trim() && "text-foreground hover:bg-surface-raised/60",
              )}
            >
              <ArrowUp aria-hidden className="size-5" />
            </button>
          </form>

          {canUseVoice && showMicHint && !capture.active && (
            <p className="mt-2 text-[11px] text-muted-foreground/60">
              Toque no microfone para falar — ou dê dois toques na esfera.
            </p>
          )}
        </div>

        <div className="flex flex-col items-center gap-8 xl:items-start xl:pt-4">
          <QuickStations className="mt-0 xl:max-w-lg" onPick={handleQuickStation} disabled={busy} />

          {/* Configuração é contexto: chips do que já foi dito + atalhos. */}
          <div className="flex flex-col items-center gap-4 xl:items-start">
            <SetupChips config={config} provided={providedFields} onPick={setConfig} />

            {ready ? (
              <div className="flex flex-col items-center gap-2">
                <Button size="sm" onClick={handleStart} disabled={busy}>
                  Entrar no Modo Sombra
                </Button>
                <p className="text-[11px] text-muted-foreground/60">{configSecondaryLine(config)}</p>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground/60">{configSummary(config)}</p>
            )}

            <button
              type="button"
              onClick={() => setShowAdjust((v) => !v)}
              aria-expanded={showAdjust}
              className="flex items-center gap-1.5 rounded-md px-1 text-xs text-muted-foreground/60 transition-colors hover:text-foreground"
            >
              <SlidersHorizontal aria-hidden className="size-3.5" />
              {showAdjust ? "Ocultar ajustes" : "Mais ajustes"}
            </button>
          </div>
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
