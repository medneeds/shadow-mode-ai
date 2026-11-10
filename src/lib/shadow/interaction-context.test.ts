import { expect, test } from "vitest";
import { observableStateSummary, buildInteractionContext } from "./interaction-context";
import { initializeCase, applyAction, buildAction } from "@/lib/clinical/clinical-case-engine";
import { referenceCase } from "@/lib/clinical/reference-cases";
test("unmeasured vitals and glucose never reach the language model", () => {
  const runtime = initializeCase(referenceCase);
  runtime.patient = { ...runtime.patient, vitals: { ...runtime.patient.vitals, glucoseMgDl: 28 } };
  const summary = observableStateSummary(runtime);
  expect(summary).not.toContain("FC=");
  expect(summary).not.toContain("PA=");
  expect(summary).not.toContain("glicemia=");
});
test("only performed monitoring makes numeric vitals available", () => {
  let runtime = initializeCase(referenceCase);
  runtime = applyAction(runtime, buildAction(referenceCase, runtime, "place_monitoring"), referenceCase).runtime;
  expect(observableStateSummary(runtime)).toContain(`FC=${runtime.patient.vitals.heartRate}`);
  expect(observableStateSummary(runtime)).not.toContain("glicemia=");
  expect(buildInteractionContext({ def: referenceCase, runtime, conversation: "Médico: reavaliar" }).recentTraineeInputs).toEqual(["reavaliar"]);
});