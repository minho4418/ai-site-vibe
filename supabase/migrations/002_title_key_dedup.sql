-- =========================================================================
-- Migration 002 — title_key 기반 누적 중복 제거
-- 같은 사건이 직링크/구글뉴스/매체간 와이어 카피로 url 만 다르게 여러 번
-- 저장되던 문제를 막는다. 정규화한 제목(title_key)에 UNIQUE 를 걸고,
-- 크론 upsert 의 onConflict 대상을 url → title_key 로 바꾼다(코드 측 변경).
--
-- ⚠️ 실행 순서: 이 SQL 을 먼저 Supabase SQL Editor 에서 1회 실행한 뒤,
--    title_key onConflict 를 쓰는 새 ingest 코드를 배포해야 한다.
--    (UNIQUE 인덱스가 없으면 onConflict:"title_key" upsert 가 에러난다.)
--
-- 이 파일은 (1) 컬럼 추가 → (2) 백필 → (3) 누적 중복 정리 → (4) UNIQUE 인덱스
-- 를 모두 같은 키 식으로 수행하므로, 인덱스 생성이 중복 때문에 실패할 일이 없다.
-- 재실행해도 안전(IF NOT EXISTS / 멱등).
--
-- titleKey 식은 src/app/api/cron/ingest/route.ts 의 titleKey() 와 일치해야 한다:
--   1) Google News url 이면 제목 끝 " - 매체명" 접미사 제거
--   2) 소문자화 후 영문/숫자/한글만 남김
--   3) 앞 64자
--   4) 비면 'url:' || url 로 폴백
-- =========================================================================

-- 1) 컬럼 추가
alter table public.articles add column if not exists title_key text;

-- 2) 백필 — 기존 모든 행의 title_key 계산
update public.articles
set title_key = left(
  regexp_replace(
    lower(
      case
        when url like '%news.google.com%'
          then regexp_replace(title, '\s+[-–—|]\s+[^-–—|]+$', '')
        else title
      end
    ),
    '[^a-z0-9가-힣]+', '', 'g'
  ),
  64
);

-- 빈 키(기호/비라틴 제목 등)는 url 로 폴백해 서로 뭉개지지 않게 한다.
update public.articles
set title_key = 'url:' || url
where title_key is null or title_key = '';

-- 3) 누적 중복 정리 — title_key 당 1건만 남기고 나머지 삭제.
--    우선순위: 직링크 > 구글뉴스, 좋아요 많은 것, 썸네일 있는 것, 오래된(원본) 것.
--    (bookmarks/likes 는 article_id ON DELETE CASCADE 라 함께 정리됨.)
with ranked as (
  select
    id,
    row_number() over (
      partition by title_key
      order by
        (url like '%news.google.com%') asc,   -- 직링크 우선(false 가 먼저)
        likes_count desc,
        (thumbnail_url is not null) desc,
        created_at asc
    ) as rn
  from public.articles
)
delete from public.articles a
using ranked r
where a.id = r.id and r.rn > 1;

-- 4) UNIQUE 인덱스 — 위에서 같은 키로 정리했으므로 반드시 성공한다.
create unique index if not exists articles_title_key_key
  on public.articles (title_key);
