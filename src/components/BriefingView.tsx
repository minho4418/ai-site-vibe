import Link from "next/link";

import { formatBriefingDate } from "@/lib/format-briefing-date";
import type { Briefing, BriefingItem } from "@/lib/briefings";

// 브리핑 1건의 전체 본문. /daily 와 /daily/[date] 가 공유한다(서버 렌더, 훅 없음).
// 가독성 우선(에디토리얼): 제목·헤딩은 Pretendard 굵게(브랜드 포스터 폰트 미사용),
// 각 항목은 '굵은 리드 + 옅은 상세' 2단으로 위계를 준다.

// 항목 본문을 리드(첫 문장)와 상세(나머지)로 나눈다 — 데이터 변경 없이 스캔성을 높인다.
// 종결부호 뒤에 공백이 와야 분리(버전·소수점 'v1.0'·'5.5'·'$10/월' 오분리 방지).
function splitLead(text: string): { lead: string; rest: string } {
  const m = text.match(/^(.+?[.!?。])\s+([\s\S]+)$/u);
  if (m && m[1].length >= 8) return { lead: m[1].trim(), rest: m[2].trim() };
  return { lead: text, rest: "" };
}

const linkClass =
  "underline decoration-violet-400/40 underline-offset-[3px] transition-colors hover:text-violet-600 hover:decoration-violet-500 dark:hover:text-violet-300";

const ExternalIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-0.5 inline-block h-3.5 w-3.5 align-[-1px] text-zinc-400">
    <path d="M7 17 17 7M9 7h8v8" />
  </svg>
);

// 주어진 텍스트를 item.url 에 맞춰 링크(내부 <Link> / 외부 새 탭) 또는 평문으로 감싼다.
function Linked({ item, text, className }: { item: BriefingItem; text: string; className?: string }) {
  if (!item.url) return <span className={className}>{text}</span>;
  if (item.url.startsWith("/")) {
    return (
      <Link href={item.url} className={`${linkClass} ${className ?? ""}`}>
        {text}
      </Link>
    );
  }
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className={`${linkClass} ${className ?? ""}`}>
      {text}
      <ExternalIcon />
    </a>
  );
}

function Source({ source }: { source: string }) {
  return (
    <span className="mt-1 inline-block text-xs font-semibold text-zinc-400 dark:text-zinc-500">
      · {source}
    </span>
  );
}

// 리스트 항목: 굵은 리드(링크) + 옅은 상세 + 출처.
function NewsItem({ item }: { item: BriefingItem }) {
  const { lead, rest } = splitLead(item.text);
  return (
    <li className="flex items-start gap-3">
      <span className="mt-[9px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500/60" />
      <div className="flex-1">
        <Linked
          item={item}
          text={lead}
          className="font-semibold text-zinc-900 dark:text-zinc-100"
        />
        {rest && (
          <p className="mt-1 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
            {rest}
          </p>
        )}
        {item.source && <Source source={item.source} />}
      </div>
    </li>
  );
}

export function BriefingView({ briefing }: { briefing: Briefing }) {
  return (
    <article className="flex flex-col gap-9">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-violet-600 dark:text-violet-400">
            {formatBriefingDate(briefing.date, true)}
          </span>
          {briefing.sample && (
            <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
              예시
            </span>
          )}
        </div>
        <h1 className="text-[26px] font-extrabold leading-snug tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-[32px]">
          {briefing.title ?? "오늘의 AI·개발 브리핑"}
        </h1>
        {briefing.summary && (
          <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
            {briefing.summary}
          </p>
        )}
      </header>

      {briefing.sections.map((section, i) => (
        <section key={i} className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-xl">
            <span className="inline-block h-[18px] w-1 rounded-full bg-gradient-to-b from-fuchsia-500 to-violet-600" />
            {section.heading}
          </h2>
          <ul className="flex flex-col gap-4">
            {section.items.map((item, j) => (
              <NewsItem key={j} item={item} />
            ))}
          </ul>
        </section>
      ))}

      {briefing.pick && (
        <section className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.05] p-5 dark:border-violet-400/20 dark:bg-violet-400/[0.07]">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-violet-700 dark:text-violet-300">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M12 2l2.9 6.3 6.9.7-5.1 4.7 1.4 6.8L12 17.8 5.9 20.5l1.4-6.8L2.2 9l6.9-.7z" />
            </svg>
            오늘의 한 줄 추천
          </h2>
          <p className="text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200 sm:text-base">
            <Linked item={briefing.pick} text={briefing.pick.text} />
            {briefing.pick.source && <Source source={briefing.pick.source} />}
          </p>
        </section>
      )}
    </article>
  );
}
