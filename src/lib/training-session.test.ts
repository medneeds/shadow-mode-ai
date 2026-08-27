import { describe, expect, it } from "vitest";

import {
  completeSession,
  createSession,
  defaultConfig,
  durationToSeconds,
  formatClock,
} from "./training-session";

describe("training session domain", () => {
  it.each([
    ["3", 180, "03:00"],
    ["5", 300, "05:00"],
    ["15", 900, "15:00"],
    ["30", 1800, "30:00"],
  ])("resolves %s minutes atomically", (durationId, seconds, clock) => {
    const config = { ...defaultConfig, durationId };
    const session = createSession(config, "case-under-test");

    expect(durationToSeconds(durationId)).toBe(seconds);
    expect(session.durationSeconds).toBe(seconds);
    expect(session.remainingSeconds).toBe(seconds);
    expect(formatClock(session.remainingSeconds)).toBe(clock);
    expect(session.config).toEqual(config);
    expect(session.caseId).toBe("case-under-test");
  });

  it("completes exactly once", () => {
    const active = createSession(defaultConfig, "case-under-test");
    const first = completeSession(active, 100);
    const repeated = completeSession(first, 200);

    expect(first.completed).toBe(true);
    expect(first.finishedAt).toBe(100);
    expect(repeated).toBe(first);
  });
});
