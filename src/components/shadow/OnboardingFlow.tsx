import { useMemo, useState } from "react";

import { VoicePresence } from "@/components/shadow/VoicePresence";
import { Button } from "@/components/ui/button";
import { useShadowSpeech } from "@/lib/voice/use-shadow-speech";
import {
  careerStages,
  comfortOptions,
  emptyProfile,
  expectationOptions,
  profileRows,
  saveDoctorProfile,
  strengthOptions,
  stressStyles,
  toneOptions,
  type DoctorProfile,
} from "@/lib/profile/doctor-profile";
import { cn } from "@/lib/utils";

/**
 * Primeiro acesso: o Sombra conhece o médico antes de treinar com ele.
 * Uma pergunta por vez, sempre pulável, nunca um formulário.
 * O que é dito aqui muda linguagem, ritmo e padrões — nunca a verdade clínica.
 */
type StepId =
  | "stage"
  | "stress"
  | "strengths"
  | "scarcity"
  | "fast"
  | "expectation"
  | "voice"
  | "tone";

const STEPS: { id: StepId; question: string; hint?: string }[] = [
  { id: "stage", question: "Em que momento da carreira você está?" },
  { id: "stress", question: "Como você lida com estresse agudo?" },
  { id: "strengths", question: "O que você já domina bem?", hint: "Pode escolher mais de um" },
  { id: "scarcity", question: "E cenários com escassez de recursos?" },
  { id: "fast", question: "Raciocínio clínico rápido, sob relógio?" },
  {
    id: "expectation",
    question: "O que você espera da Shadow Medical Training?",
    hint: "Pode escolher mais de um",
  },
  { id: "voice", question: "Qual voz você quer que eu tenha?" },
  { id: "tone", question: "E como você quer que eu fale com você?" },
];

export function OnboardingFlow({
  onComplete,
  onSkip,
  initial,
}: {
  onComplete: (profile: DoctorProfile) => void;
  onSkip: () => void;
  initial?: DoctorProfile | null;
}) {
  const [index, setIndex] = useState(0);
  const [review, setReview] = useState(false);
  const [draft, setDraft] = useState<DoctorProfile>(initial ?? emptyProfile);
  const [expectation, setExpectation] = useState(initial?.expectation ?? "");
  const speech = useShadowSpeech();

  const step = STEPS[index]!;
  const last = index === STEPS.length - 1;
  const progress = useMemo(() => `${index + 1} de ${STEPS.length}`, [index]);

  const advance = (patch: Partial<DoctorProfile>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    if (last) {
      setReview(true);
      return;
    }
    setIndex((i) => i + 1);
  };

  const confirm = () => {
    const finished: DoctorProfile = { ...draft, completedAt: Date.now() };
    saveDoctorProfile(finished);
    onComplete(finished);
  };

  const previewVoice = (voice: "female" | "male") => {
    void speech.speak({
      turnId: `preview-${voice}-${Date.now()}`,
      text: "Sou o Sombra. Vou treinar com você.",
      voicePreference: voice,
      speechRate: "normal",
    });
  };

  if (review) {
    const rows = profileRows(draft);
    return (
      <div className="flex flex-col items-center text-center">
        <VoicePresence state={speech.speaking ? "speaking" : "idle"} getAmplitude={() => speech.getAmplitude()} />

        <p className="eyebrow mt-2 opacity-50">Primeiro acesso · Resumo</p>
        <p className="mt-3 max-w-lg font-display text-xl leading-relaxed">
          É assim que vou treinar com você
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Dá para ajustar qualquer resposta agora — ou depois, no seu perfil.
        </p>

        <dl className="mt-7 w-full max-w-md divide-y divide-[color:var(--hairline)] text-left">
          {rows.map((row, i) => (
            <div key={row.label} className="flex items-baseline justify-between gap-6 py-3">
              <dt className="text-xs text-muted-foreground">{row.label}</dt>
              <dd className="flex items-baseline gap-3 text-right text-sm text-foreground">
                <span>{row.value ?? <span className="text-muted-foreground/50">Não respondido</span>}</span>
                <button
                  type="button"
                  onClick={() => {
                    setReview(false);
                    setIndex(i);
                  }}
                  className="text-[11px] text-muted-foreground/60 hover:text-foreground"
                >
                  Ajustar
                </button>
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 flex items-center gap-4">
          <Button size="sm" onClick={confirm}>
            Salvar e começar
          </Button>
          <button
            type="button"
            onClick={() => {
              setReview(false);
              setIndex(STEPS.length - 1);
            }}
            className="text-xs text-muted-foreground/60 hover:text-foreground"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <VoicePresence state={speech.speaking ? "speaking" : "idle"} getAmplitude={() => speech.getAmplitude()} />

      <p className="eyebrow mt-2 opacity-50">Primeiro acesso · {progress}</p>

      <p aria-live="polite" className="mt-3 max-w-lg font-display text-xl leading-relaxed">
        {step.question}
      </p>
      {step.hint && <p className="mt-1 text-xs text-muted-foreground/70">{step.hint}</p>}

      <div className="mt-7 flex w-full max-w-md flex-wrap justify-center gap-2">
        {step.id === "stage" &&
          careerStages.map((s) => (
            <Pick key={s.id} label={s.label} hint={s.hint} onClick={() => advance({ stage: s.id })} />
          ))}

        {step.id === "stress" &&
          stressStyles.map((s) => (
            <Pick key={s.id} label={s.label} hint={s.hint} onClick={() => advance({ stress: s.id })} />
          ))}

        {step.id === "strengths" && (
          <StrengthPicker
            value={draft.strengths}
            onChange={(strengths) => setDraft((p) => ({ ...p, strengths }))}
            onDone={() => advance({ strengths: draft.strengths })}
          />
        )}

        {step.id === "scarcity" &&
          comfortOptions.map((c) => (
            <Pick key={c.id} label={c.label} onClick={() => advance({ scarcity: c.id })} />
          ))}

        {step.id === "fast" &&
          comfortOptions.map((c) => (
            <Pick key={c.id} label={c.label} onClick={() => advance({ fastThinking: c.id })} />
          ))}

        {step.id === "expectation" && (
          <div className="flex w-full flex-col items-center gap-4">
            <div className="flex flex-wrap justify-center gap-2">
              {expectationOptions.map((option) => {
                const on = draft.expectations.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setDraft((p) => ({
                        ...p,
                        expectations: on
                          ? p.expectations.filter((v) => v !== option)
                          : [...p.expectations, option],
                      }))
                    }
                    className={cn(
                      "rounded-full border border-hairline px-3 py-1.5 text-xs transition-colors",
                      on
                        ? "border-foreground/35 bg-surface-raised/60 text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            <form
              className="flex w-full flex-col items-center gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                advance({ expectations: draft.expectations, expectation: expectation.trim() || null });
              }}
            >
              <textarea
                value={expectation}
                onChange={(e) => setExpectation(e.target.value)}
                rows={2}
                placeholder="Quer acrescentar algo? (opcional)"
                aria-label="Sua expectativa"
                className="w-full resize-none border-b border-hairline bg-transparent py-2 text-center text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-foreground/40 focus:outline-none"
              />
              <Button size="sm" type="submit">
                Continuar
              </Button>
            </form>
          </div>
        )}

        {step.id === "voice" && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-wrap justify-center gap-2">
              <Pick
                label="Feminina"
                hint="Ouvir prévia ao tocar"
                onClick={() => {
                  previewVoice("female");
                  setDraft((p) => ({ ...p, voicePreference: "female" }));
                }}
                selected={draft.voicePreference === "female"}
              />
              <Pick
                label="Masculina"
                hint="Ouvir prévia ao tocar"
                onClick={() => {
                  previewVoice("male");
                  setDraft((p) => ({ ...p, voicePreference: "male" }));
                }}
                selected={draft.voicePreference === "male"}
              />
            </div>
            <Button
              size="sm"
              disabled={!draft.voicePreference}
              onClick={() => advance({ voicePreference: draft.voicePreference })}
            >
              Continuar
            </Button>
          </div>
        )}

        {step.id === "tone" &&
          toneOptions.map((t) => (
            <Pick key={t.id} label={t.label} hint={t.hint} onClick={() => advance({ tone: t.id })} />
          ))}
      </div>

      <div className="mt-8 flex items-center gap-4 text-xs text-muted-foreground/60">
        {index > 0 && (
          <button type="button" onClick={() => setIndex((i) => i - 1)} className="hover:text-foreground">
            Voltar
          </button>
        )}
        <button
          type="button"
          onClick={() => (last ? advance({}) : setIndex((i) => i + 1))}
          className="hover:text-foreground"
        >
          Pular esta
        </button>
        <button type="button" onClick={onSkip} className="hover:text-foreground">
          Pular tudo
        </button>
      </div>
    </div>
  );
}

function Pick({
  label,
  hint,
  selected,
  onClick,
}: {
  label: string;
  hint?: string;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-2xl border border-hairline px-4 py-3 text-left transition-all duration-200",
        "hover:border-foreground/25 hover:bg-surface-raised/50 active:scale-[0.98]",
        selected && "border-foreground/35 bg-surface-raised/60",
      )}
    >
      <span className="block text-sm text-foreground">{label}</span>
      {hint && <span className="mt-0.5 block text-[11px] text-muted-foreground/70">{hint}</span>}
    </button>
  );
}

function StrengthPicker({
  value,
  onChange,
  onDone,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  onDone: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap justify-center gap-2">
        {strengthOptions.map((s) => {
          const on = value.includes(s);
          return (
            <button
              key={s}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((v) => v !== s) : [...value, s])}
              className={cn(
                "rounded-full border border-hairline px-3 py-1.5 text-xs transition-colors",
                on ? "border-foreground/35 bg-surface-raised/60 text-foreground" : "text-muted-foreground",
              )}
            >
              {s}
            </button>
          );
        })}
      </div>
      <Button size="sm" onClick={onDone}>
        Continuar
      </Button>
    </div>
  );
}
