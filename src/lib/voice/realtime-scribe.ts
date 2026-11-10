export type RealtimeTokenProvider = (signal: AbortSignal) => Promise<string>;
type ScribeOptions = {
  token: RealtimeTokenProvider;
  onPartial: (text: string) => void;
  onCommitted: (text: string) => void;
  onFailure: () => void;
  socket?: (url: string) => WebSocket;
};

/** Token acquisition is deliberately injected: never mint via an unauthenticated route. */
export class RealtimeScribe {
  private socket: WebSocket | null = null;
  private controller: AbortController | null = null;
  private generation = 0;
  private reconnects = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private stopped = true;
  constructor(private options: ScribeOptions) {}

  async connect(): Promise<boolean> {
    this.stopped = false;
    const generation = ++this.generation;
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    try {
      const token = await this.options.token(controller.signal);
      if (controller.signal.aborted || generation !== this.generation) return false;
      const url = new URL("wss://api.elevenlabs.io/v1/speech-to-text/realtime");
      url.search = new URLSearchParams({
        token, model_id: "scribe_v2_realtime", audio_format: "pcm_16000",
        language_code: "por", commit_strategy: "vad",
      }).toString();
      const socket = (this.options.socket ?? (url => new WebSocket(url)))(url.toString());
      this.socket = socket;
      socket.onmessage = event => {
        if (generation !== this.generation || this.stopped) return;
        let message: { message_type?: string; text?: string };
        try { message = JSON.parse(String(event.data)); } catch { return; }
        if (message.message_type === "session_started") this.reconnects = 0;
        if (message.message_type === "partial_transcript") this.options.onPartial(message.text ?? "");
        if (message.message_type === "committed_transcript" && message.text?.trim()) {
          this.options.onPartial("");
          this.options.onCommitted(message.text.trim());
        }
        if (message.message_type?.endsWith("error") || ["quota_exceeded", "rate_limited"].includes(message.message_type ?? "")) {
          this.stop(); this.options.onFailure();
        }
      };
      socket.onclose = () => {
        if (generation !== this.generation || this.stopped) return;
        this.socket = null;
        this.options.onPartial("");
        if (++this.reconnects > 2) { this.stop(); this.options.onFailure(); return; }
        // A fresh single-use token is obtained on every reconnection; confirmed history lives upstream.
        this.reconnectTimer = setTimeout(() => void this.connect(), this.reconnects * 500);
      };
      return true;
    } catch {
      if (generation === this.generation && !this.stopped) { this.stop(); this.options.onFailure(); }
      return false;
    }
  }

  sendAudio(base64Pcm: string): boolean {
    if (!this.socket || this.socket.readyState !== 1 || this.stopped) return false;
    this.socket.send(JSON.stringify({ message_type: "input_audio_chunk", audio_base_64: base64Pcm, sample_rate: 16000, commit: false }));
    return true;
  }

  stop(): void {
    this.stopped = true; this.generation++;
    this.controller?.abort(); this.controller = null;
    clearTimeout(this.reconnectTimer);
    const socket = this.socket; this.socket = null;
    if (socket) { socket.onmessage = null; socket.onclose = null; socket.close(); }
    this.options.onPartial("");
  }
}