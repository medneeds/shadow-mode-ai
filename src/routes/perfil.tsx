import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { PageSection, SectionHeading } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { OnboardingFlow } from "@/components/shadow/OnboardingFlow";
import { useTrainingSession } from "@/lib/session-store";
import {
  clearDoctorProfile,
  loadDoctorProfile,
  profileDefaults,
  profileRows,
  type DoctorProfile,
} from "@/lib/profile/doctor-profile";
import { pageTitle } from "@/lib/brand";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: pageTitle("Perfil do médico") },
      {
        name: "description",
        content:
          "Seu perfil de treinamento: momento de carreira, estilo sob pressão, voz e tom do Sombra.",
      },
      { property: "og:title", content: pageTitle("Perfil do médico") },
      {
        property: "og:description",
        content: "Personalize a forma como o Sombra fala e treina com você.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { setConfig } = useTrainingSession();
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setProfile(loadDoctorProfile());
    setLoaded(true);
  }, []);

  const complete = (next: DoctorProfile) => {
    setProfile(next);
    setConfig(profileDefaults(next));
    setEditing(false);
  };

  if (editing) {
    return (
      <AppShell>
        <PageSection>
          <OnboardingFlow initial={profile} onComplete={complete} onSkip={() => setEditing(false)} />
        </PageSection>
      </AppShell>
    );
  }

  const rows = profile ? profileRows(profile) : [];

  return (
    <AppShell>
      <PageSection>
        <SectionHeading
          eyebrow="Perfil"
          title="Como o Sombra treina com você"
          description="Estas respostas ajustam linguagem, ritmo e padrões de configuração. Nunca alteram o caso clínico, a conduta correta nem a sua avaliação."
        />

        {loaded && !profile && (
          <div className="mt-8 max-w-xl">
            <p className="text-sm text-muted-foreground">
              Você ainda não respondeu o perfil. São oito perguntas curtas — dá para pular
              qualquer uma.
            </p>
            <Button className="mt-5" size="sm" onClick={() => setEditing(true)}>
              Responder agora
            </Button>
          </div>
        )}

        {profile && (
          <div className="mt-8 max-w-xl">
            <dl className="divide-y divide-[color:var(--hairline)]">
              {rows.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-6 py-4">
                  <dt className="text-xs text-muted-foreground">{row.label}</dt>
                  <dd className="text-right text-sm text-foreground">
                    {row.value ?? <span className="text-muted-foreground/50">Não respondido</span>}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="sm" onClick={() => setEditing(true)}>
                Revisar respostas
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  clearDoctorProfile();
                  setProfile(null);
                }}
              >
                Apagar perfil
              </Button>
            </div>
          </div>
        )}
      </PageSection>
    </AppShell>
  );
}
