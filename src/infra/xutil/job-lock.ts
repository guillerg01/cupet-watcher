let busy = false;

export function isXutilJobRunning(): boolean {
  return busy;
}

export async function withXutilJob<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T | null> {
  if (busy) {
    process.stdout.write(`[worker] [${name}] skipped — another xutil job is running\n`);
    return null;
  }

  busy = true;
  try {
    return await fn();
  } finally {
    busy = false;
  }
}
