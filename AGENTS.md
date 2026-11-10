<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the existing deterministic clinical engine authoritative; presentation modules may only select authored lines from disclosed information or emitted events, never mutate patient state.
- Use monotonic elapsed wall time for station ticks and reconcile delayed actions against the latest runtime, so network latency cannot rewind deterioration or stall station completion.
- Own fetch, audio sources, timers and completion in one idempotent playback cancellation domain, so obsolete turns cannot resume audio.
- Acquire Scribe tokens through an injected authenticated provider only; keep realtime disabled until real user authentication and issuance protection exist.
- Keep partial transcripts outside clinical input and use confirmed transcripts only; character presentation never infers the doctor's emotional state.
- Use Vitest for clinical and voice regression tests independently of the application Vite bootstrap.
- Keep Gateway calls behind server boundaries using the official SDK and preserve the selected model/output limits; this retains the provider contract without changing clinical authority.
