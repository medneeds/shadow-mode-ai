import { expect, test, vi } from "vitest";
import { RealtimeScribe } from "./realtime-scribe";

function fakeSocket() {
  return { readyState: 1, onmessage: null as ((event: { data: string }) => void) | null,
    onclose: null as (() => void) | null, close: vi.fn(), send: vi.fn() };
}
test("partial transcript never triggers a clinical input", async () => {
  const socket = fakeSocket(); const partial = vi.fn(); const committed = vi.fn();
  const scribe = new RealtimeScribe({ token: async () => "test-token", onPartial: partial,
    onCommitted: committed, onFailure: vi.fn(), socket: () => socket as unknown as WebSocket });
  await scribe.connect();
  socket.onmessage?.({ data: JSON.stringify({ message_type: "partial_transcript", text: "vou fazer" }) });
  expect(partial).toHaveBeenCalledWith("vou fazer"); expect(committed).not.toHaveBeenCalled();
  socket.onmessage?.({ data: JSON.stringify({ message_type: "committed_transcript", text: "dextro" }) });
  expect(committed).toHaveBeenCalledExactlyOnceWith("dextro");
  scribe.stop();
  expect(scribe.sendAudio("AA==")).toBe(false);
});
test("cancel during token acquisition never opens an obsolete socket", async () => {
  let resolve: (token: string) => void = () => undefined;
  const token = new Promise<string>(r => { resolve = r; });
  const socket = vi.fn();
  const scribe = new RealtimeScribe({ token: () => token, socket,
    onPartial: vi.fn(), onCommitted: vi.fn(), onFailure: vi.fn() });
  const connecting = scribe.connect(); scribe.stop(); resolve("unused-token");
  expect(await connecting).toBe(false); expect(socket).not.toHaveBeenCalled();
});
test("reconnection requests a fresh token and ignores the old socket", async () => {
  vi.useFakeTimers();
  const sockets = [fakeSocket(), fakeSocket()]; const committed = vi.fn();
  const token = vi.fn(async () => "test-token");
  let index = 0;
  const scribe = new RealtimeScribe({ token, onPartial: vi.fn(), onCommitted: committed,
    onFailure: vi.fn(), socket: () => sockets[index++] as unknown as WebSocket });
  await scribe.connect();
  const staleHandler = sockets[0]?.onmessage;
  sockets[0]?.onclose?.();
  await vi.advanceTimersByTimeAsync(500);
  staleHandler?.({ data: JSON.stringify({ message_type: "committed_transcript", text: "old" }) });
  expect(committed).not.toHaveBeenCalled(); expect(token).toHaveBeenCalledTimes(2);
  scribe.stop(); vi.useRealTimers();
});