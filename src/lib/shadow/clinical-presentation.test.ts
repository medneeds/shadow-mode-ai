import { describe, expect, test } from "vitest";
import { presentClinicalFacts } from "./clinical-presentation";
import { initializeCase } from "@/lib/clinical/clinical-case-engine";
import { referenceCase } from "@/lib/clinical/reference-cases";

describe("speaker boundaries", () => {
  test("unconscious patient never speaks even when an authorized line is disclosed", () => {
    const runtime = { ...initializeCase(referenceCase), disclosedInformationIds: ["info-alergias"] };
    const result = presentClinicalFacts(referenceCase, runtime, ["Sem alergias conhecidas."]);
    expect(result[0]?.speaker).toBe("team");
  });
  test("alert patient uses biological sex and only previously disclosed authored speech", () => {
    const runtime = initializeCase(referenceCase);
    runtime.patient = { ...runtime.patient, consciousness: "alert" };
    expect(presentClinicalFacts(referenceCase, runtime, ["Sem alergias conhecidas."])[0]?.speaker).toBe("team");
    runtime.disclosedInformationIds = ["info-alergias"];
    const before = JSON.stringify(runtime);
    expect(presentClinicalFacts(referenceCase, runtime, ["Sem alergias conhecidas."])[0]?.voicePreference).toBe("male");
    expect(presentClinicalFacts(referenceCase, runtime, ["Sem alergias conhecidas."])[0]?.speaker).toBe("patient");
    expect(JSON.stringify(runtime)).toBe(before);
  });
  test("Sombra intervenes only on explicitly authored critical trigger", () => {
    const runtime = initializeCase(referenceCase);
    const event = { id: "evt-1", type: "complication" as const, source: "omission_trigger" as const,
      fact: "Convulsão", atClinicalSecond: 360, causeTriggerId: "trg_glucose_omission_360" };
    expect(presentClinicalFacts(referenceCase, runtime, [event.fact], [event])[0]?.speaker).toBe("shadow");
    expect(presentClinicalFacts(referenceCase, runtime, [event.fact], [{ ...event, causeTriggerId: "unknown" }])[0]?.speaker).toBe("team");
  });
});