import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { MeterRow, PageSection, SectionHeading } from "@/components/ui/section";
import { mockCompetencies } from "@/lib/shadow-content";

export const Route = createFileRoute("/desempenho")({
  head: () => ({
    meta: [
      { title: "Desempenho — Shadow Mode" },
      {
        name: "description",
        content: "Acompanhe a evolução das suas competências clínicas ao longo das estações.",
      },
      { property: "og:title", content: "Desempenho — Shadow Mode" },
      {
        property: "og:description",
        content: "Evolução por competência clínica no Shadow Mode.",
      },
    ],
  }),
  component: PerformancePage,
});

function PerformancePage() {
  return (
    <AppShell>
      <PageSection>
        <SectionHeading
          eyebrow="Desempenho"
          title="Sua evolução clínica"
          description="Prévia visual. As análises reais serão calculadas a partir das estações concluídas."
        />

        <dl className="mt-8 grid gap-px overflow-hidden rounded-xl border border-hairline bg-hairline sm:grid-cols-3">
          {[
            { label: "Estações concluídas", value: "12" },
            { label: "Nota média", value: "76" },
            { label: "Tempo em simulação", value: "3h 20m" },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface p-6">
              <dt className="eyebrow">{stat.label}</dt>
              <dd className="mt-3 font-display text-3xl tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-12 max-w-2xl">
          <h3 className="text-lg">Por competência</h3>
          <div className="mt-4 divide-y divide-[color:var(--hairline)]">
            {mockCompetencies.map((c) => (
              <MeterRow key={c.label} label={c.label} value={c.value} />
            ))}
          </div>
        </div>

        <div className="mt-10">
          <Button asChild variant="secondary">
            <Link to="/treinar">Treinar ponto mais fraco</Link>
          </Button>
        </div>
      </PageSection>
    </AppShell>
  );
}
