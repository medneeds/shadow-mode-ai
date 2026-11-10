import type { ClinicalCaseDefinition, ClinicalCaseRuntime, EngineClinicalEvent } from "@/lib/clinical/clinical-case-types";

export type SimulationSpeaker = "patient" | "team" | "shadow";
export type CasePresentation = {
  patientLines?: { informationId: string; text: string; emotion: "neutral" | "hesitant" | "distressed" }[];
  criticalInterventions?: { triggerId: string; text: string }[];
};
export type PresentedUtterance = { speaker: SimulationSpeaker; text: string; voicePreference: "male" | "female" };

/** Case authors alone authorize first-person speech and observer intervention. */
export function presentClinicalFacts(
  def: ClinicalCaseDefinition,
  runtime: ClinicalCaseRuntime,
  facts: string[],
  events: EngineClinicalEvent[] = [],
): PresentedUtterance[] {
  const output: PresentedUtterance[] = [];
  const talking = runtime.patient.consciousness === "alert" || runtime.patient.consciousness === "confused";
  for (const fact of facts) {
    const info = def.patient.information.find(i => i.content === fact);
    const line = talking && info && runtime.disclosedInformationIds.includes(info.id)
      ? def.presentation?.patientLines?.find(l => l.informationId === info.id) : undefined;
    const critical = def.presentation?.criticalInterventions?.find(rule =>
      events.some(e => e.fact === fact && e.causeTriggerId === rule.triggerId));
    output.push({
      speaker: critical ? "shadow" : line ? "patient" : "team",
      text: critical ? critical.text : line ? line.text : fact,
      voicePreference: line ? def.patient.biologicalSex : critical ? "female" : "male",
    });
  }
  return output;
}

export const speakerLabels: Record<SimulationSpeaker, string> = {
  patient: "Paciente", team: "Equipe", shadow: "Sombra",
};