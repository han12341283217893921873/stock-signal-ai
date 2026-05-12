/**
 * tRPC Rate Limiting Middleware
 * - IP 기반 요청 제한 (인메모리)
 * - 공개 API: 분당 60회
 * - AI/LLM API: 분당 10회 (비용 보호)
 * - 스캐너 API: 분당 3회 (Yahoo Finance 보호)
 */
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./context";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// 5분마다 만료된 항목 정리
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of Array.from(store.entries())) {
      if (entry.resetAt < now) store.delete(key);
    }
  },
  5 * 60 * 1000
);

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): void {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `요청이 너무 많습니다. ${retryAfter}초 후 다시 시도해주세요.`,
    });
  }
}

export function getClientIp(req: TrpcContext["req"]): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return (req.socket as any)?.remoteAddress ?? "unknown";
}
