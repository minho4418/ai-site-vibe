// "2026-06-16" → "6월 16일" / 요일까지: "6월 16일 (화)".
// 문자열만 파싱(타임존 영향 없이)하고, 형식이 깨지면 입력을 그대로 돌려준다.
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function formatBriefingDate(date: string, withWeekday = false): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return date;
  const [, y, mo, d] = m;
  const base = `${Number(mo)}월 ${Number(d)}일`;
  if (!withWeekday) return base;
  // UTC 기준으로 요일만 계산(날짜 문자열 자체에 시간이 없으므로 타임존 무관).
  const wd = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d))).getUTCDay();
  return `${base} (${WEEKDAYS[wd]})`;
}
