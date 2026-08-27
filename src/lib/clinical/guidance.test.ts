import { describe, expect, it } from "vitest";

import { initializeCase } from "./clinical-case-engine";
import { caseLibrary } from "./case-library";
import { autonomyForLevel, resolveActiveGuidance } from "./guidance";

describe("guidance autonomy", () => {
  it("never exposes guidance in advanced mode", () => {
    for (const definition of caseLibrary) {
      expect(
        resolveActiveGuidance(definition, initializeCase(definition), "autonomous"),
      ).toBeNull();
    }
  });

  it("maps every authored level to its intended autonomy", () => {
    expect(autonomyForLevel("basico")).toBe("guided");
    expect(autonomyForLevel("intermediario")).toBe("adaptive");
    expect(autonomyForLevel("avancado")).toBe("autonomous");
  });
});
