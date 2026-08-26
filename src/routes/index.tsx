import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { VoicePresence } from "@/components/shadow/VoicePresence";
import { PageSection, SectionHeading } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { levels, themes } from "@/lib/shadow-content";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shadow Mode — Treinamento clínico por voz" },
      {
        name: "description",
        content:
          "Entre em cenários clínicos por voz, conduza o atendimento e descubra como você realmente decide sob pressão.",
      },
      { property: "og:title", content: "Shadow Mode — Treinamento clínico por voz" },
      {
        property: "og:description",
        content: "Simulação clínica por voz para estudantes, residentes e médicos.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <AppShell>
      {/* Hero */}
      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pt-14 pb-8 sm:px-8 sm:pt-20 md:grid-cols-[1.15fr_1fr] md:gap-14">
        <div>
          <p className="eyebrow">Simulação clínica por voz</p>
          <h1 className="mt-4 text-[2.1rem] leading-[1.1] sm:text-5xl md:text-[3.4rem]">
            Treine decisões clínicas.
            <br />
            <span className="text-muted-foreground">Não respostas decoradas.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            Entre em cenários clínicos por voz, conduza o atendimento e descubra como você realmente
            decide sob pressão.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link to="/treinar">Iniciar treinamento</Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link to="/historico">Ver histórico</Link>
            </Button>
          </div>
        </div>

        <div className="flex justify-center md:justify-end">
          <VoicePresence state="idle" />
        </div>
      </section>

      {/* Como funciona */}
      <PageSection>
        <SectionHeading
          eyebrow="Como funciona"
          title="Escolha um cenário. Entre no Modo Sombra. Conduza o caso."
        />
        <ol className="mt-8 grid gap-px overflow-hidden rounded-xl border border-hairline bg-hairline sm:grid-cols-3">
          {[
            {
              step: "01",
              title: "Configurar estação",
              text: "Defina tema, nível e duração da estação clínica.",
            },
            {
              step: "02",
              title: "Conduzir por voz",
              text: "Fale naturalmente. Peça exames, examine, decida.",
            },
            {
              step: "03",
              title: "Receber devolutiva",
              text: "Veja o que passou, o que era esperado e como melhorar.",
            },
          ].map((item) => (
            <li key={item.step} className="bg-surface p-6">
              <span className="font-display text-sm text-gold">{item.step}</span>
              <h3 className="mt-3 text-lg">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
            </li>
          ))}
        </ol>
      </PageSection>

      {/* Níveis */}
      <PageSection className="pt-0">
        <SectionHeading
          eyebrow="Níveis de treinamento"
          title="Do fundamento clínico à prova de título"
          description="Cada nível ajusta a complexidade do caso, a pressão da estação e a profundidade esperada da sua conduta."
        />
        <div className="mt-8 divide-y divide-[color:var(--hairline)]">
          {levels.map((level) => (
            <div
              key={level.id}
              className="flex flex-col gap-2 py-6 sm:flex-row sm:items-baseline sm:gap-10"
            >
              <div className="sm:w-52">
                <h3 className="text-xl">{level.label}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{level.audience}</p>
              </div>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                {level.description}
              </p>
            </div>
          ))}
        </div>
      </PageSection>

      {/* Temas */}
      <PageSection className="pt-0">
        <SectionHeading eyebrow="Áreas" title="Temas disponíveis para estações" />
        <ul className="mt-8 flex flex-wrap gap-2">
          {themes.map((theme) => (
            <li
              key={theme.id}
              className="rounded-full border border-hairline px-4 py-2 text-sm text-muted-foreground"
            >
              {theme.label}
            </li>
          ))}
        </ul>
        <div className="mt-10">
          <Button asChild>
            <Link to="/treinar">Configurar estação</Link>
          </Button>
        </div>
      </PageSection>
    </AppShell>
  );
}
