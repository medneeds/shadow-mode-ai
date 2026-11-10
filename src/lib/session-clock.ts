import type { TrainingSession } from "./training-session";

/** Wall time is independent from request latency and interval throttling. */
export function elapsedWholeSeconds(baselineMs: number, nowMs: number, remaining: number): number {
  return Math.min(remaining, Math.max(0, Math.floor((nowMs - baselineMs) / 1000)));
}

export function tickSession(session: TrainingSession, seconds: number): TrainingSession {
  if (session.status !== "active") return session;
  return { ...session, remainingSeconds: Math.max(0, session.remainingSeconds - seconds) };
}