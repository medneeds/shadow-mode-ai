import { describe, expect, test } from "vitest";
import { applyAction, advanceClinicalTime, buildAction, disclosableInformation, initializeCase } from "./clinical-case-engine";
import type { ClinicalCaseDefinition } from "./clinical-case-types";

const definition = {
  id: "regression-case", opening: "Dor abdominal", patient: {
    information: [
      { id: "public", group: "história", content: "Dor abdominal", availability: { kind: "opening" } },
      { id: "secret", group: "história", content: "Alergia específica", availability: { kind: "requires_action", actionId: "ask_allergy" } },
    ],
  },
  initialState: {
    consciousness: "alert", airway: "patent",
    breathing: { effort: "normal", description: "" },
    circulation: { perfusion: "normal", description: "" },
    neurologic: { gcs: 15, pupils: "isocoric_reactive", focalDeficit: false, seizing: false },
    vitals: { heartRate: 90, respiratoryRate: 16, systolicBP: 120, diastolicBP: 80, oxygenSaturation: 98, temperatureC: 37 },
    tags: [],
  },
  actions: [
    { id: "access", label: "Acesso", category: "procedure" },
    { id: "ask_allergy", label: "Perguntar alergia", category: "history", prerequisites: ["access"] },
    { id: "order_exam", label: "Solicitar exame", category: "investigation", requestsInvestigationId: "exam" },
  ],
  expectedActions: [],
  investigations: [{ id: "exam", name: "Exame", category: "laboratory", availabilityDelaySeconds: 10, result: "Resultado controlado" }],
  examFindings: [],
  timeTriggers: [{ id: "omission", atClinicalSecond: 5, conditions: [{ kind: "action_missing", actionId: "ask_allergy" }], source: "omission_trigger", eventType: "new_symptom", fact: "Omissão detectada", once: true }],
  completion: { stabilizedTag: "estável", resolutionActionIds: [], maxClinicalSeconds: 120 },
} as unknown as ClinicalCaseDefinition;

describe("clinical engine regressions", () => {
  test("invalid prerequisite never satisfies an action trigger or discloses history", () => {
    let runtime = initializeCase(definition);
    expect(disclosableInformation(runtime, definition).information.map(x => x.id)).toEqual(["public"]);
    runtime = applyAction(runtime, buildAction(definition, runtime, "ask_allergy"), definition).runtime;
    expect(runtime.actionLog[0]?.status).toBe("not_applicable");
    expect(disclosableInformation(runtime, definition).information.map(x => x.id)).toEqual(["public"]);
    runtime = advanceClinicalTime(runtime, 5, definition).runtime;
    expect(runtime.firedTriggerIds).toContain("omission");
  });

  test("valid prerequisite releases information", () => {
    let runtime = initializeCase(definition);
    runtime = applyAction(runtime, buildAction(definition, runtime, "access"), definition).runtime;
    runtime = applyAction(runtime, buildAction(definition, runtime, "ask_allergy"), definition).runtime;
    expect(disclosableInformation(runtime, definition).information.map(x => x.id)).toContain("secret");
  });

  test("repeat investigation request cannot postpone result", () => {
    let runtime = initializeCase(definition);
    runtime = applyAction(runtime, buildAction(definition, runtime, "order_exam"), definition).runtime;
    runtime = advanceClinicalTime(runtime, 7, definition).runtime;
    runtime = applyAction(runtime, buildAction(definition, runtime, "order_exam"), definition).runtime;
    expect(runtime.actionLog.at(-1)?.status).toBe("not_applicable");
    runtime = advanceClinicalTime(runtime, 3, definition).runtime;
    expect(runtime.investigations['exam']?.status).toBe("available");
  });

  test("identical actions and elapsed time produce identical clinical state", () => {
    const run = () => {
      let r = initializeCase(definition);
      r = applyAction(r, buildAction(definition, r, "order_exam"), definition).runtime;
      return advanceClinicalTime(r, 12, definition).runtime;
    };
    expect(run()).toEqual(run());
  });
});
