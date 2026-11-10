/** Bounded UI wait, without replaying an unknown/billed server operation. */
export async function waitForTurn<T>(operation: Promise<T>, timeoutMs = 25000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("turn_timeout")), timeoutMs);
      }),
    ]);
  } finally { clearTimeout(timer); }
}