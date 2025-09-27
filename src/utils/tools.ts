export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function WaitOrTimeout<T>(task: Promise<T>, timeout: number): Promise<T> {
  const ctl = new AbortController();
  let ret: T | null = null;
  return await Promise.race([
    (async () => {
      ret = await task;
      ctl.abort();
      return ret;
    })(),
    sleep(timeout).then(() => {
      if (ctl.signal.aborted) {
        return ret as T;
      }
      return Promise.reject("Timeout");
    })
  ]);
}
