import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { PageSection, SectionHeading } from "@/components/ui/section";
import { mockHistory } from "@/lib/shadow-content";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de estações — Shadow Mode" },
      {
        name: "description",
        content: "Veja as estações clínicas que você conduziu no Shadow Mode.",
      },
      { property: "og:title", content: "Histórico de estações — Shadow Mode" },
      {
        property: "og:description",
        content: "Acompanhe suas simulações anteriores e revise cada devolutiva.",
      },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  return (
    <AppShell>
      <PageSection>
        <SectionHeading
          eyebrow="Histórico"
          title="Estações conduzidas"
          description="Dados de exemplo. O registro real das estações será ativado em uma próxima etapa."
        />

        <ul className="mt-8 divide-y divide-[color:var(--hairline)]">
          {mockHistory.map((item) => (
            <li key={item.id}>
              <Link
                to="/resultado"
                className="flex flex-col gap-3 py-5 transition-colors hover:bg-surface/60 sm:flex-row sm:items-center sm:gap-8 sm:px-2"
              >
                <span className="font-display text-2xl tabular-nums sm:w-16">{item.score}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-foreground">{item.summary}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {item.theme} · {item.level} · {item.duration}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">{item.date}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-10">
          <Button asChild>
            <Link to="/treinar">Iniciar treinamento</Link>
          </Button>
        </div>
      </PageSection>
    </AppShell>
  );
}
