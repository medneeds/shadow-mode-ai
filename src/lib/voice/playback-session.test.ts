import { describe, expect, test } from "vitest";
import { PlaybackSession, PcmDecoder } from "./playback-session";

describe("voice cancellation", () => {
  test("cancel settles interrupted playback and aborts once", async () => {
    const playback = new PlaybackSession();
    let stops = 0;
    playback.own(() => { stops++; });
    playback.cancel(); playback.cancel(); playback.finish(true);
    expect(await playback.completed).toBe(false);
    expect(playback.controller.signal.aborted).toBe(true);
    expect(stops).toBe(1);
  });
  test("late audio resources are disposed immediately and cannot revive old turn", async () => {
    const old = new PlaybackSession();
    old.cancel();
    let obsoleteAudio = 0;
    old.own(() => { obsoleteAudio++; });
    const current = new PlaybackSession();
    current.finish(true);
    expect(obsoleteAudio).toBe(1);
    expect(await old.completed).toBe(false);
    expect(await current.completed).toBe(true);
  });
  test("PCM decoding preserves samples across odd network boundaries", () => {
    const decoder = new PcmDecoder();
    expect([...decoder.decode(new Uint8Array([0]))]).toEqual([]);
    expect([...decoder.decode(new Uint8Array([64, 0, 128]))]).toEqual([0.5, -1]);
  });
});