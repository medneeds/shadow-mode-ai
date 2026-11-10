import { expect, test, vi } from "vitest";
import { waitForTurn } from "./turn-timeout";
test("stalled server response releases the station without replaying the operation", async () => {
  vi.useFakeTimers();
  const operation = vi.fn(() => new Promise<never>(() => undefined));
  const result = expect(waitForTurn(operation(), 25000)).rejects.toThrow("turn_timeout");
  await vi.advanceTimersByTimeAsync(25000); await result;
  expect(operation).toHaveBeenCalledTimes(1);
  vi.useRealTimers();
});