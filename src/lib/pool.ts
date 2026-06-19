// 고정 동시성 워커 풀: cursor 를 공유하는 N 개 워커가 items 를 하나씩 집어 task 로 처리하고,
// 항목이 소진되면 끝난다. cron(maxDuration) 안에서 og:image 보강·AI 요약 보강이 같은 패턴을
// 따로 구현하던 걸 공용화한 것. (외부 API 를 동시 호출하되 동시성 상한을 두기 위함.)
export async function runPool<T>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      await task(items[cursor++]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}
