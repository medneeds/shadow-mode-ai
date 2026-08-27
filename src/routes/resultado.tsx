import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Volume2 } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { VoicePresence } from "@/components/shadow/VoicePresence";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MeterRow, PageSection, SectionHeading } from "@/components/ui/section";
import { useTrainingSession } from "@/lib/session-store";
import { buildCompletedResult } from "@/lib/evaluation/completed-result";
import { deterministicDebriefing } from "@/lib/evaluation/debrief-fallback";
import { generateDebriefing } from "@/lib/evaluation/debrief.functions";
import type { CompletedTrainingResult, Debriefing } from "@/lib/evaluation/evaluation-types";
import { shadowSummary, traineeSummary } from "@/lib/shadow-trainer";
import { useShadowSpeech } from "@/lib/voice/use-shadow-speech";
import { durationLabel, levelLabel, themeLabel } from "@/lib/training-session";
import { pageTitle } from "@/lib/brand";

export const Route = createFileRoute("/resultado")({
  head: () => ({
    meta: [
      { title: pageTitle("Devolutiva da estação") },
      {
        name: "description",
        content:
          "Devolutiva estruturada da estação: nota determinística, acertos, omissões, pontos críticos e conduta esperada.",
      },
      { property: "og:title", content: pageTitle("Devolutiva da estação") },
      {
        property: "og:description",
        content: "Entenda exatamente o que você fez, o que deixou passar e onde melhorar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResultPage,
});

function ResultPage() {
  const { session, lastCompleted, lastRuntime, lastCaseDefinition } = useTrainingSession();
  const completed = session?.completed ? session : lastCompleted;

  const result = useMemo<CompletedTrainingResult | null>(() => {
    if (!completed || !completed.completed || !lastRuntime || !lastCaseDefinition) return null;
    if (lastRuntime.caseId !== completed.caseId || lastCaseDefinition.id !== completed.caseId)
      return null;
    return buildCompletedResult(lastCaseDefinition, lastRuntime, completed);
  }, [completed, lastRuntime, lastCaseDefinition]);

  if (!result || !completed) {
    return (
      <AppShell>
        <PageSection>
          <SectionHeading
            eyebrow="Devolutiva"
            title="Nenhuma estação concluída"
            description="Conduza uma estação no Modo Sombra para receber sua devolutiva."
          />
          <div className="mt-8">
            <Button asChild size="lg">
              <Link to="/treinar">Treinar</Link>
            </Button>
          </div>
        </PageSection>
      </AppShell>
    );
  }

  return <ResultView result={result} />;
}

function ResultView({ result }: { result: CompletedTrainingResult }) {
  const { evaluation, configuration: config } = result;
  const requestDebrief = useServerFn(generateDebriefing);
  const speech = useShadowSpeech();

  // A avaliação determinística é a fonte da verdade; o texto começa determinístico.
  const [debriefing, setDebriefing] = useState<Debriefing>(() =>
    deterministicDebriefing(evaluation),
  );

  useEffect(() => {
    let active = true;
    void requestDebrief({
      data: {
        trainerProfile: config.trainerProfile,
        evaluation: {
          overallScore: evaluation.overallScore,
          bandLabel: evaluation.bandLabel,
          headline: evaluation.headline,
          outcome: evaluation.outcome,
          categories: evaluation.categories.map((c) => ({
            label: c.label,
            score: c.score,
            maxScore: c.maxScore,
            percentage: c.percentage,
          })),
          strengths: evaluation.strengths,
          misses: evaluation.misses,
          criticalIssues: evaluation.criticalIssues,
          improvements: evaluation.improvements,
        },
      },
    })
      .then((next) => {
        if (active && next?.summary) setDebriefing(next);
      })
      .catch(() => {
        /* a devolutiva determinística permanece exibida */
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.sessionId]);

  useEffect(() => () => speech.stop(), [speech]);

  // Transição contida: as ondas assentam, há uma calma breve, então a devolutiva.
  const [settling, setSettling] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettling(false), 900);
    return () => window.clearTimeout(timer);
  }, []);

  const voiceAvailable = config.shadowOutputMode === "voice_text";

  return (
    <AppShell>
      {settling && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-background transition-opacity duration-500">
          <VoicePresence state="finished" className="scale-75" />
        </div>
      )}

      <PageSection className="pb-2">
        <p className="eyebrow">Estação concluída</p>
        <h1 className="mt-3 text-2xl sm:text-3xl">{result.caseTitle}</h1>
        <p className="mt-3 font-display text-sm text-muted-foreground">
          {themeLabel(config.themeId)} · {levelLabel(config.levelId)} ·{" "}
          {durationLabel(config.durationId)} ·{" "}
          {shadowSummary(config.shadowOutputMode, config.voicePreference, config.trainerProfile)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Suas respostas: {traineeSummary(config.traineeInputMode)} · a modalidade não influencia a
          avaliação clínica.
        </p>
      </PageSection>

      {/* --- nota: tipografia, sem gamificação --- */}
      <PageSection className="py-6">
        <div className="flex flex-col gap-6 border-t border-hairline pt-8 sm:flex-row sm:items-start sm:gap-12">
          <div className="shrink-0">
            <p className="eyebrow">Nota geral</p>
            <p className="mt-2 font-display text-6xl leading-none tabular-nums">
              {evaluation.overallScore}
              <span className="text-xl text-muted-foreground/60">/100</span>
            </p>
            <p className="mt-3 text-sm text-foreground">{evaluation.bandLabel}</p>
          </div>
          <div className="min-w-0">
            <p className="text-sm leading-relaxed text-muted-foreground">{evaluation.headline}</p>
            <p className="mt-3 break-words text-sm leading-relaxed text-foreground">
              {debriefing.summary}
            </p>
            {voiceAvailable && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-4"
                onClick={() =>
                  speech.speaking
                    ? speech.stop()
                    : void speech.speak({
                        turnId: `debrief-${result.sessionId}`,
                        text: debriefing.summary,
                        voicePreference: config.voicePreference,
                        speechRate: config.speechRate,
                      })
                }
              >
                <Volume2 aria-hidden className="size-4" />
                {speech.speaking ? "Parar resumo" : "Ouvir resumo"}
              </Button>
            )}
            <p className="mt-4 text-xs text-muted-foreground/70">
              {evaluation.outcome} · caso {evaluation.caseVersion} · rubrica{" "}
              {evaluation.scoringVersion}
            </p>
          </div>
        </div>
      </PageSection>

      {/* --- domínios --- */}
      <PageSection className="py-6">
        <h2 className="text-lg">Competências avaliadas</h2>
        <div className="mt-4 grid lg:grid-cols-2 lg:gap-x-16">
          {evaluation.categories.map((c) => (
            <MeterRow
              key={c.category}
              label={`${c.label} · ${c.score}/${c.maxScore}`}
              value={c.percentage}
            />
          ))}
        </div>
      </PageSection>

      {/* --- blocos educacionais --- */}
      <PageSection className="py-6">
        <div className="grid gap-10 md:grid-cols-2 xl:gap-x-20">
          <FeedbackBlock
            title="Você fez bem"
            items={evaluation.strengths}
            empty="Nenhuma ação de alto valor foi concluída dentro das janelas esperadas."
          />
          <FeedbackBlock
            title="Você deixou passar"
            items={evaluation.misses}
            empty="Nada relevante ficou de fora nesta estação."
          />
          <FeedbackBlock
            title="Pontos críticos"
            tone="critical"
            items={evaluation.criticalIssues}
            empty="Nenhuma falha crítica de segurança ocorreu nesta estação."
          />
          <FeedbackBlock title="Como melhorar" items={debriefing.improvements} />
        </div>
      </PageSection>

      {/* --- divulgação progressiva --- */}
      <PageSection className="py-6">
        <Accordion type="multiple" className="max-w-3xl xl:max-w-4xl">
          <AccordionItem value="conduta">
            <AccordionTrigger>Conduta esperada</AccordionTrigger>
            <AccordionContent>
              <ol className="space-y-3">
                {evaluation.expectedManagement.map((step, index) => (
                  <li
                    key={step}
                    className="flex gap-3 text-sm leading-relaxed text-muted-foreground"
                  >
                    <span className="font-display text-xs tabular-nums text-gold">{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="timeline">
            <AccordionTrigger>Linha do tempo da estação</AccordionTrigger>
            <AccordionContent>
              {result.timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum registro nesta estação.</p>
              ) : (
                <ol className="divide-y divide-[color:var(--hairline)]">
                  {result.timeline.map((entry, index) => (
                    <li key={`${entry.atClinicalSecond}-${index}`} className="flex gap-4 py-3">
                      <span className="w-12 shrink-0 font-display text-xs tabular-nums text-gold">
                        {entry.clock}
                      </span>
                      <span className="min-w-0 break-words text-sm text-muted-foreground">
                        {entry.kind === "trainee_action" ? "Você: " : ""}
                        {entry.text}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="transcricao">
            <AccordionTrigger>Ver transcrição da estação</AccordionTrigger>
            <AccordionContent>
              {result.transcript.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma entrada registrada.</p>
              ) : (
                <ul className="divide-y divide-[color:var(--hairline)]">
                  {result.transcript.map((entry, index) => (
                    <li key={`${entry.clock}-${index}`} className="py-3">
                      <p className="text-xs text-muted-foreground/70">
                        {entry.clock} ·{" "}
                        {entry.source === "voice"
                          ? "voz"
                          : entry.source === "guided_option"
                            ? "apoio"
                            : "texto"}
                      </p>
                      <p className="mt-1 break-words text-sm text-foreground">
                        Você disse: {entry.rawContent}
                      </p>
                      <p className="mt-1 break-words text-xs text-muted-foreground">
                        O Sombra entendeu:{" "}
                        {entry.understoodActions.length > 0
                          ? entry.understoodActions.join(" · ")
                          : "nenhuma ação clínica"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/treinar">Treinar novamente</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/">Início</Link>
          </Button>
        </div>
      </PageSection>
    </AppShell>
  );
}

function FeedbackBlock({
  title,
  items,
  tone,
  empty,
}: {
  title: string;
  items: string[];
  tone?: "critical";
  empty?: string;
}) {
  return (
    <div className="min-w-0">
      <h2 className={tone === "critical" ? "text-lg text-gold" : "text-lg"}>{title}</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li
              key={item}
              className="flex min-w-0 gap-3 text-sm leading-relaxed text-muted-foreground"
            >
              <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-moss" />
              <span className="min-w-0 break-words">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
