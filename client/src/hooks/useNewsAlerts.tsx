/**
 * useNewsAlerts — 60초마다 최신 뉴스를 폴링하여 새 헤드라인이 나타나면
 * sonner 토스트로 속보 알림을 표시합니다.
 * DashboardLayout 또는 App 루트에서 한 번만 마운트하세요.
 */
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const POLL_INTERVAL = 60_000; // 60초
const SEEN_KEY = "stock-ai-seen-news";
const MAX_SEEN = 100;

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveSeen(seen: Set<string>) {
  try {
    const arr = Array.from(seen).slice(-MAX_SEEN);
    localStorage.setItem(SEEN_KEY, JSON.stringify(arr));
  } catch {}
}

export function useNewsAlerts() {
  const seenRef = useRef<Set<string>>(loadSeen());
  const initializedRef = useRef(false);

  const { data: news } = trpc.macro.news.useQuery(undefined, {
    refetchInterval: POLL_INTERVAL,
    staleTime: POLL_INTERVAL - 5000,
  });

  useEffect(() => {
    if (!news || !Array.isArray(news)) return;

    // 첫 마운트 시에는 기존 뉴스를 모두 "이미 봄"으로 표시하고 알림 안 띄움
    if (!initializedRef.current) {
      news.forEach((n: any) => {
        const key = n.id ?? n.title;
        if (key) seenRef.current.add(String(key));
      });
      saveSeen(seenRef.current);
      initializedRef.current = true;
      return;
    }

    let toastCount = 0;
    news.forEach((n: any) => {
      const key = String(n.id ?? n.title ?? "");
      if (!key || seenRef.current.has(key)) return;
      if (toastCount >= 2) return; // 한 번에 최대 2개

      seenRef.current.add(key);
      toastCount++;

      const impact = (n as any).impact ?? 5;
      const isHigh = impact >= 7;

      toast(
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {isHigh ? "🔴 속보" : "📰 뉴스"} · {n.source ?? "시장 뉴스"}
          </span>
          <span className="text-xs font-medium leading-snug line-clamp-2">
            {n.title}
          </span>
        </div>,
        {
          duration: isHigh ? 8000 : 5000,
          position: "top-right",
          className: isHigh
            ? "border-red-500/40 bg-red-500/10"
            : "border-primary/20 bg-primary/5",
        }
      );
    });

    if (toastCount > 0) saveSeen(seenRef.current);
  }, [news]);
}
