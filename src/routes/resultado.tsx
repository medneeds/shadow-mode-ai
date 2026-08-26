import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { MeterRow, PageSection, SectionHeading } from "@/components/ui/section";
import { mockCompetencies } from "@/lib/shadow-content";

export const Route = createFileRoute("/resultado")({
  head: () => ({
    meta: [
      { title: "Devolutiva da estação — Shadow Mode" },
      {
        name: "description",
        content: "Devolutiva estruturada da estação: acertos, omissões, pontos críticos e conduta esperada.",
      },
      { property: "og:title", content: "Devolutiva da estação — Shadow Mode" },
      {
        property: "og:description",
        content: "Entenda onde melhorar depois de conduzir o caso clínico.",
      },
    ],
  }),
  component: ResultPage,
});

const timeline = [
  { time: "00:12", text: "Verificou responsividade e chamou ajuda" },
  { time: "01:04", text: "Iniciou avaliação de vias aéreas" },
  { time: "03:20", text: "Solicitou glicemia capilar" },
  { time: "06:45", text: "Pediu tomografia de crânio" },
  { time: "11:30", text: "Definiu destino: unidade de terapia intensiva" },
];

export function ResultSections() {
  return null;
}

function ResultPage() {
  return (
    <AppShell>
      <PageSection className="pb-4">
        <SectionHeading
          eyebrow="Devolutiva · exemplo"
          title="Choque séptico de foco urinário"
          description="Prévia da linguagem visual da devolutiva. Os valores são ilustrativos nesta fase."
        />
      </PageSection>

      <PageSection className="py-0">
        <div className="panel flex flex-col gap-8 p-6 sm:flex-row sm:items-center sm:gap-12">
          <div>
            <p className="eyebrow">Nota geral</p>
            <p className="mt-2 font-display text-6xl tabular-nums">
              78<span className="text-2xl text-muted-foreground">/100</span>
            </p>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Estabilização adequada e priorização segura. A maior perda foi no exame físico dirigido
            e na reavaliação após a expansão volêmica.
          </p>
        </div>
      </PageSection>

      <PageSection>
        <SectionHeading eyebrow="Competências" title="Como você decidiu" />
        <div className="mt-6 max-w-2xl divide-y divide-[color:var(--hairline)]">
          {mockCompetencies.map((c) => (
            <MeterRow key={c.label} label={c.label} value={c.value} />
          ))}
        </div>
      </PageSection>

      <PageSection className="pt-0">
        <div className="grid gap-10 md:grid-cols-2">
          <FeedbackBlock
            title="Você fez bem"
            items={[
              "Reconheceu instabilidade hemodinâmica precocemente",
              "Solicitou lactato e culturas antes do antibiótico",
              "Comunicou-se de forma clara com a equipe",
            ]}
          />
          <FeedbackBlock
            title="Você deixou passar"
            items={[
              "Não realizou exame de pele e perfusão periférica",
              "Não reavaliou resposta após expansão volêmica",
              "Não questionou uso prévio de antibióticos",
            ]}
          />
          <FeedbackBlock
            title="Pontos críticos"
            tone="critical"
            items={[
              "Antibiótico iniciado após 62 minutos da admissão",
              "Sem monitorização contínua durante a fase inicial",
            ]}
          />
          <FeedbackBlock
            title="Como melhorar"
            items={[
              "Estruture a reavaliação em blocos de 10 minutos",
              "Verbalize hipóteses e diferenciais em voz alta",
              "Defina metas objetivas de ressuscitação",
            ]}
          />
        </div>
      </PageSection>

      <PageSection className="pt-0">
        <SectionHeading eyebrow="Conduta esperada" title="Linha do tempo da estação" />
        <ol className="mt-6 max-w-2xl divide-y divide-[color:var(--hairline)]">
          {timeline.map((item) => (
            <li key={item.time} className="flex gap-6 py-4">
              <span className="font-display text-sm tabular-nums text-gold">{item.time}</span>
              <span className="text-sm text-muted-foreground">{item.text}</span>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/treinar">Treinar novamente</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/historico">Ver histórico</Link>
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
}: {
  title: string;
  items: string[];
  tone?: "critical";
}) {
  return (
    <div>
      <h3 className={tone === "critical" ? "text-lg text-gold" : "text-lg"}>{title}</h3>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
            <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-moss" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
