import { expect, test } from "vitest";
import { unsafeInterpretationReason } from "./action-safety";
import { matchDeterministicActions } from "./speech-normalization";
const catalog = [{ id: "drug", label: "Medicar", category: "medication" as const }];
test("negated clinical commands never enter the deterministic shortcut", () => {
  expect(matchDeterministicActions("não solicitar dextro", ["check_capillary_glucose"])).toBeNull();
  expect(unsafeInterpretationReason("não medicar", [{ actionId: "drug", value: null }], catalog)).toBeTruthy();
});
test("doses and self-corrections are not silently mapped to generic treatment", () => {
  expect(matchDeterministicActions("oxigênio 2 litros", ["administer_oxygen"])).toBeNull();
  expect(unsafeInterpretationReason("500... não, 250 ml", [{ actionId: "drug", value: "250 ml" }], catalog)).toBeTruthy();
  expect(unsafeInterpretationReason("medicar 5 mg", [{ actionId: "drug", value: "5 mg" }], catalog)).toBeTruthy();
});