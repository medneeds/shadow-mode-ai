/**
 * Harness de desenvolvimento do Case Engine.
 * NÃO é a interface do trainee — serve para exercitar ação → motor → evento.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { PageSection, SectionHeading } from "@/components/ui/section";
import {
  advanceClinicalTime,
  applyAction,
  buildAction,
  disclosableInformation,
  formatClinicalClock,
  initializeCase,
} from "@/lib/clinical/clinical-case-engine";
import { referenceCase } from "@/lib/clinical/reference-cases";
import { runEngineChecks } from "@/lib/clinical/engine-checks";

export const Route = createFileRoute("/dev/motor-clinico")({
  head: () => ({
    meta: [
      { title: "Harness do motor clínico — Shadow Mode" },
      {
        name: "description",
        content:
          "Ferramenta interna para exercitar o motor de casos clínicos determinístico do Shadow Mode.",
      },
      { property: "og:title", content: "Harness do motor clínico — Shadow Mode" },
      {
        property: "og:description",
        content: "Ambiente de desenvolvimento para validar ações, eventos e transições de estado.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EngineHarness,
});

function EngineHarness() {
  const def = referenceCase;
  const [runtime, setRuntime] = useState(() => initializeCase(def));
  const checks = useMemo(() => runEngineChecks(), []);
  const disclosure = disclosableInformation(runtime, def);

  const doAction = (actionId: string) => {
    setRuntime((prev) => applyAction(prev, buildAction(def, prev, actionId, "dev_harness"), def).runtime);
  };
  const doTime = (seconds: number) => {
    setRuntime((prev) => advanceClinicalTime(prev, seconds, def).runtime);
  };

  return (
    <AppShell>
      <PageSection className="pb-6">
        <SectionHeading
          eyebrow="Ferramenta interna"
          title="Harness do motor clínico"
          description="Ambiente de desenvolvimento. Caso fictício, sem LLM e sem voz: cada ação e cada avanço de tempo clínico passam pelo motor determinístico."
        />
      </PageSection>

      <PageSection className="py-0">
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="panel p-6">
            <p className="eyebrow">Estado do paciente</p>
            <p className="mt-2 font-display text-lg">
              Tempo clínico {formatClinicalClock(runtime.elapsedClinicalSeconds)} · desfecho{" "}
              {runtime.outcome}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                ["Consciência", runtime.patient.consciousness],
                ["Via aérea", runtime.patient.airway],
                ["Glasgow", String(runtime.patient.neurologic.gcs)],
                ["FC", `${runtime.patient.vitals.heartRate} bpm`],
                ["FR", `${runtime.patient.vitals.respiratoryRate} irpm`],
                [
                  "PA",
                  `${runtime.patient.vitals.systolicBP}/${runtime.patient.vitals.diastolicBP} mmHg`,
                ],
                ["SpO₂", `${runtime.patient.vitals.oxygenSaturation}%`],
                [
                  "Glicemia",
                  runtime.patient.vitals.glucoseMgDl
                    ? `${runtime.patient.vitals.glucoseMgDl} mg/dL`
                    : "não aferida",
                ],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 flex flex-wrap gap-2">
              {[30, 60, 180].map((s) => (
                <Button key={s} variant="outline" size="sm" onClick={() => doTime(s)}>
                  +{s}s de tempo clínico
                </Button>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setRuntime(initializeCase(def))}>
                Reiniciar caso
              </Button>
            </div>
          </div>

          <div className="panel p-6">
            <p className="eyebrow">Catálogo de ações</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {def.actions.map((a) => (
                <Button key={a.id} variant="outline" size="sm" onClick={() => doAction(a.id)}>
                  {a.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="panel p-6">
            <p className="eyebrow">Log de ações</p>
            <ul className="mt-4 space-y-1 text-sm">
              {runtime.actionLog.length === 0 && (
                <li className="text-muted-foreground">Nenhuma ação registrada.</li>
              )}
              {runtime.actionLog.map((a) => (
                <li key={a.id} className="flex justify-between gap-4">
                  <span>
                    {formatClinicalClock(a.clinicalTime)} — {a.label}
                  </span>
                  <span className="text-muted-foreground">{a.status}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel p-6">
            <p className="eyebrow">Log de eventos clínicos</p>
            <ul className="mt-4 space-y-2 text-sm">
              {runtime.events.length === 0 && (
                <li className="text-muted-foreground">Nenhum evento emitido.</li>
              )}
              {runtime.events.map((e) => (
                <li key={e.id}>
                  <span className="text-muted-foreground">
                    {formatClinicalClock(e.atClinicalSecond)} · {e.type} · {e.source}
                  </span>
                  <p>{e.fact}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel p-6">
            <p className="eyebrow">Informação divulgável agora</p>
            <ul className="mt-4 space-y-1 text-sm">
              {disclosure.information.map((i) => (
                <li key={i.id}>
                  <span className="text-muted-foreground">{i.group}: </span>
                  {i.content}
                </li>
              ))}
              {disclosure.investigationResults.map((r) => (
                <li key={r.id}>
                  <span className="text-muted-foreground">{r.name}: </span>
                  {r.result}
                </li>
              ))}
            </ul>
          </div>

          <div className="panel p-6">
            <p className="eyebrow">Validação determinística</p>
            <ul className="mt-4 space-y-2 text-sm">
              {checks.map((c) => (
                <li key={c.name}>
                  <span className={c.passed ? "text-moss" : "text-destructive"}>
                    {c.passed ? "OK" : "FALHA"}
                  </span>{" "}
                  {c.name}
                  <p className="text-xs text-muted-foreground">{c.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </PageSection>
    </AppShell>
  );
}
