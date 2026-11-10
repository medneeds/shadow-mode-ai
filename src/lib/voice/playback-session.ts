/** One cancellation domain: fetch, queued audio and completion settle together. */
export class PlaybackSession {
  readonly controller = new AbortController();
  private cleanups = new Set<() => void>();
  private resolve: (played: boolean) => void = () => undefined;
  readonly completed = new Promise<boolean>((resolve) => { this.resolve = resolve; });
  private settled = false;

  own(cleanup: () => void): () => void {
    if (this.settled) cleanup();
    else this.cleanups.add(cleanup);
    return () => this.cleanups.delete(cleanup);
  }

  finish(played: boolean): void {
    if (this.settled) return;
    this.settled = true;
    this.controller.abort();
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups.clear();
    this.resolve(played);
  }
  cancel(): void { this.finish(false); }
}

/** Carries an odd byte between network chunks; PCM is little-endian, mono 24 kHz. */
export class PcmDecoder {
  private carry: number | undefined;
  decode(chunk: Uint8Array): Float32Array {
    const data = this.carry === undefined ? chunk : Uint8Array.from([this.carry, ...chunk]);
    const count = Math.floor(data.length / 2);
    const samples = new Float32Array(count);
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    for (let i = 0; i < count; i++) samples[i] = view.getInt16(i * 2, true) / 32768;
    this.carry = data.length % 2 ? data[data.length - 1] : undefined;
    return samples;
  }
}