import { describe, expect, test } from "vitest";
import { elapsedWholeSeconds, tickSession } from "./session-clock";
import { createSession, defaultConfig, durationToSeconds } from "./training-session";
import { advanceClinicalTime, initializeCase, buildAction, applyAction } from "./clinical/clinical-case-engine";
import { referenceCase } from "./clinical/reference-cases";
import { reconcileTurn } from "./clinical/reconcile-turn";

describe("station duration and deterministic clock", () => {
  for (const minutes of [3, 5, 15, 30]) {
    test(`${minutes} minute station reaches exactly zero with intact clinical history`, () => {
      expect(durationToSeconds(String(minutes))).toBe(minutes * 60);
      let session = createSession({ ...defaultConfig, durationId: String(minutes) });
      let runtime = initializeCase(referenceCase);
      for (let i = 0; i < minutes * 60; i++) {
        session = tickSession(session, 1);
        runtime = advanceClinicalTime(runtime, 1, referenceCase).runtime;
      }
      expect(session.remainingSeconds).toBe(0);
      expect(runtime.elapsedClinicalSeconds).toBe(minutes * 60);
      expect(runtime.firedTriggerIds).toContain("trg_glucose_omission_180");
      expect(new Set(runtime.events.map(e => e.id)).size).toBe(runtime.events.length);
    });
  }
  test("throttled timers catch up and never exceed remaining station time", () => {
    expect(elapsedWholeSeconds(100, 45100, 900)).toBe(45);
    expect(elapsedWholeSeconds(100, 45100, 3)).toBe(3);
  });
  test("paused station does not consume clinical seconds", () => {
    const session = { ...createSession(defaultConfig), status: "paused" as const };
    expect(tickSession(session, 60).remainingSeconds).toBe(900);
  });
  test("late interpretation never rewinds deterioration or repeats events", () => {
    const initial = initializeCase(referenceCase);
    const returned = applyAction(initial, buildAction(referenceCase, initial, "obtain_iv_access"), referenceCase).runtime;
    const current = advanceClinicalTime(initial, 190, referenceCase).runtime;
    const merged = reconcileTurn(current, returned, referenceCase);
    expect(merged.elapsedClinicalSeconds).toBe(190);
    expect(merged.firedTriggerIds).toEqual(current.firedTriggerIds);
    expect(merged.patient.vitals.heartRate).toBe(118);
    expect(merged.actionLog.at(-1)?.actionId).toBe("obtain_iv_access");
    expect(reconcileTurn(merged, returned, referenceCase)).toEqual(merged);
  });
});