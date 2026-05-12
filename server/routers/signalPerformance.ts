import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getSignalPerformanceStats, getRecentSignalPerformances } from "../db";

export const signalPerformanceRouter = router({
  /** 신호 성과 통계 (전체 승률, 평균 수익률 등) */
  stats: publicProcedure.query(async () => {
    return getSignalPerformanceStats();
  }),

  /** 최근 신호 성과 기록 */
  recent: publicProcedure
    .input(
      z.object({ limit: z.number().min(1).max(100).default(20) }).optional()
    )
    .query(async ({ input }) => {
      return getRecentSignalPerformances(input?.limit ?? 20);
    }),
});
