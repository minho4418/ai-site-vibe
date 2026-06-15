"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getSupabaseBrowser } from "./supabase-browser";

export function useLikes(deviceId: string | null) {
  const [set, setSet] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Map<string, number>>(new Map());
  const [hydrated, setHydrated] = useState(false);

  // 빠른 연타 시 stale closure 를 피하기 위해 현재 set 을 ref 로 추적.
  const setRef = useRef<Set<string>>(set);
  useEffect(() => {
    setRef.current = set;
  }, [set]);

  // DB 가 진실의 원천. 페이지 마다 한 번 device_id 로 likes 를 fetch 해서 초기 상태 구성.
  // (이전엔 localStorage 캐시를 같이 썼지만, 북마크와 동일하게 DB 단일 출처로 통일.)
  useEffect(() => {
    if (!deviceId) return;
    const supabase = getSupabaseBrowser();

    if (!supabase) {
      // Supabase 미설정 (목업 모드) — 빈 Set 으로 시작.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Supabase 미설정(목업) 시 빈 상태로 마운트 hydration(의도된 패턴)
      setHydrated(true);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("likes")
        .select("article_id")
        .eq("device_id", deviceId);
      if (cancelled) return;
      if (error) {
        console.error("[likes] fetch failed:", error.message);
      } else if (data) {
        const next = new Set(data.map((r) => String(r.article_id)));
        setRef.current = next;
        setSet(next);
      }
      setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [deviceId]);

  const toggle = useCallback(
    (articleId: string, currentCount: number) => {
      const wasLiked = setRef.current.has(articleId);
      const optimistic = wasLiked ? Math.max(0, currentCount - 1) : currentCount + 1;
      const rpcName = wasLiked ? "decrement_likes" : "increment_likes";

      // 1) 좋아요 set 낙관적 토글
      setSet((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.delete(articleId);
        else next.add(articleId);
        setRef.current = next;
        return next;
      });

      // 2) 카운트 override 낙관적 +1/-1
      setOverrides((prev) => {
        const next = new Map(prev);
        next.set(articleId, optimistic);
        return next;
      });

      const supabase = getSupabaseBrowser();
      if (!supabase || !deviceId) return;

      // 3) RPC 호출 → 성공 시 정확한 카운트로 동기화, 실패 시 롤백
      supabase
        .rpc(rpcName, { p_article_id: articleId, p_device_id: deviceId })
        .then(({ data, error }) => {
          if (error) {
            console.error(`[likes] ${rpcName} failed:`, error.message);
            setSet((curr) => {
              const r = new Set(curr);
              if (wasLiked) r.add(articleId);
              else r.delete(articleId);
              setRef.current = r;
              return r;
            });
            setOverrides((curr) => {
              const r = new Map(curr);
              r.set(articleId, currentCount);
              return r;
            });
            return;
          }
          if (typeof data === "number") {
            setOverrides((curr) => {
              const r = new Map(curr);
              r.set(articleId, data);
              return r;
            });
          }
        });
    },
    [deviceId],
  );

  return { set, overrides, toggle, hydrated };
}
