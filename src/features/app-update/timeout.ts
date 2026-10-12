/** 제한 시간이 지나면 fallback으로 끝내고, 늦게 도착한 결과나 예외는 무시한다. */
export function withTimeout<T>(
  start: () => Promise<T>,
  timeoutMs: number,
  fallback: T,
): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: T) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => finish(fallback), timeoutMs);
    let work: Promise<T>;
    try {
      work = start();
    } catch {
      finish(fallback);
      return;
    }
    work.then(
      (value) => finish(value),
      () => finish(fallback),
    );
  });
}
