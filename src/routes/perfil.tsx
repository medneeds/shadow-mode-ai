import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { PageSection, SectionHeading } from "@/components/ui/section";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { levels } from "@/lib/shadow-content";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil e preferências — Modo Sombra | By Medneeds" },
      {
        name: "description",
        content: "Ajuste nível padrão, preferências de voz e acessibilidade do Modo Sombra.",
      },
      { property: "og:title", content: "Perfil e preferências — Modo Sombra | By Medneeds" },
      {
        property: "og:description",
        content: "Preferências de treinamento, voz e acessibilidade.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <AppShell>
      <PageSection>
        <SectionHeading
          eyebrow="Perfil"
          title="Preferências"
          description="Conta e autenticação serão ativadas em uma próxima etapa. Por enquanto, estas preferências são apenas visuais."
        />

        <div className="mt-8 flex items-center gap-4">
          <span
            aria-hidden
            className="flex size-14 items-center justify-center rounded-full border border-gold/40 font-display text-lg text-gold"
          >
            AB
          </span>
          <div>
            <p className="text-sm text-foreground">Artur Batista</p>
            <p className="text-xs text-muted-foreground">Nível intermediário · Emergência</p>
          </div>
        </div>

        <div className="mt-12 max-w-xl">
          <h3 className="text-lg">Nível padrão</h3>
          <ul className="mt-4 divide-y divide-[color:var(--hairline)]">
            {levels.map((level) => (
              <li key={level.id} className="flex items-baseline justify-between gap-6 py-4">
                <div>
                  <p className="text-sm text-foreground">{level.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{level.audience}</p>
                </div>
                {level.id === "intermediario" && (
                  <span className="rounded-full bg-moss-soft px-3 py-1 text-xs text-foreground">
                    Selecionado
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-12 max-w-xl">
          <h3 className="text-lg">Simulação e acessibilidade</h3>
          <div className="mt-4 divide-y divide-[color:var(--hairline)]">
            {[
              { id: "voice-hints", label: "Dicas por voz durante a estação", checked: false },
              { id: "transcript", label: "Exibir transcrição da conversa", checked: true },
              { id: "reduced-motion", label: "Reduzir animações", checked: false },
            ].map((pref) => (
              <div key={pref.id} className="flex items-center justify-between gap-6 py-4">
                <Label htmlFor={pref.id} className="text-sm font-normal">
                  {pref.label}
                </Label>
                <Switch id={pref.id} defaultChecked={pref.checked} />
              </div>
            ))}
          </div>
        </div>
      </PageSection>
    </AppShell>
  );
}
