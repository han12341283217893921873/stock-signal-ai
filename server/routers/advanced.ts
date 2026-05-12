import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { runAdvancedAnalysis } from "../advanced/Engine";

export const advancedRouter = router({
  /** 차세대 종합 분석 실행 */
  analyze: publicProcedure
    .input(z.object({ ticker: z.string().min(1).max(20) }))
    .query(async ({ input }) => {
      return runAdvancedAnalysis(input.ticker.toUpperCase());
    }),

  /** 시장 기상도 조회 */
  weather: publicProcedure.query(async () => {
    const { getMarketWeather } = await import("../advanced/MacroDefense");
    return getMarketWeather();
  }),
});
