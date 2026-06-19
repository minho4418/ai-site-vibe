# Supabase 스키마

이 폴더는 Knewit 의 데이터베이스 스키마를 **코드로 버전관리**한다. 그동안 스키마는 운영 DB 안에만
암묵적으로 존재했는데(신규 환경 셋업·협업·AI 작업이 막힘), 운영 DB 에서 역추출해 베이스라인으로 고정했다.

## 구조
- `migrations/0001_init.sql` — 전체 베이스라인(테이블·인덱스·FK·RPC 함수·RLS 정책). idempotent.

이후 변경은 `migrations/0002_*.sql`, `0003_*.sql` … 식으로 **새 파일을 추가**한다(기존 파일 수정 금지 — 재현성 보존).

## 적용 방법

### A. Supabase CLI (권장)
```bash
supabase db push          # migrations/ 를 원격 DB 에 적용
```

### B. 대시보드 SQL Editor
새 환경이라면 `0001_init.sql` 전체를 복사해 SQL Editor 에 붙여 Run.

## 스키마 요약

| 테이블 | 키 | 용도 |
|---|---|---|
| `articles` | PK `id`, UNIQUE idx `title_key` | 수집 기사. `title_key` 로 누적 중복 차단(ingest `on conflict`) |
| `likes` | PK `(device_id, article_id)`, FK→articles CASCADE | 기기별 익명 좋아요 |
| `bookmarks` | PK `(device_id, article_id)`, FK→articles CASCADE | 기기별 익명 북마크 |
| `daily_briefings` | PK `date` | 날짜당 1건 브리핑. `threads_post_id` = Threads 게시 멱등 키 |

**RPC**(SECURITY DEFINER): `increment_likes` / `decrement_likes` / `increment_views`.

**RLS**: 4개 테이블 모두 활성. anon 은 `articles`·`daily_briefings` 읽기만, `likes`·`bookmarks` 는
읽기+추가+삭제(토글). 쓰기(수집·발행)는 service_role 키로 RLS 를 우회한다.

> ⚠️ 이 파일들은 운영 DB 에서 역추출한 것이라 실제와 일치한다. 스키마를 바꿀 때는
> **DB 와 이 폴더를 함께** 갱신해 드리프트를 막을 것.
