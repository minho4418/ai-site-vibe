// KST(UTC+9) 기준 "YYYY-MM-DD". 별 수 스냅샷의 날짜 키 등 '한국 기준 오늘' 판정용.
// now 를 기본 인자로 받아 직접 Date.now() 호출(impure)을 피한다 — timeAgo 와 동일 패턴.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
export function kstDateString(now: number = Date.now()): string {
  return new Date(now + KST_OFFSET_MS).toISOString().slice(0, 10);
}

// "YYYY-MM-DD" 두 날짜의 차이(일). a - b. 스냅샷 경과일 계산용.
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);
}

// 발행 후 windowMs 이내인지(= "방금 들어온" 글인지). 🆕NEW 배지 판정용.
// now 를 기본 인자로 받아 렌더 중 직접 Date.now() 호출(impure)을 피한다 — timeAgo 와 동일 패턴.
export function isFresh(iso: string, windowMs: number, now: number = Date.now()): boolean {
  return now - new Date(iso).getTime() < windowMs;
}

export function timeAgo(iso: string, now: number = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}주 전`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월 전`;
  return `${Math.floor(days / 365)}년 전`;
}
