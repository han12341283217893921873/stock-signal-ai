import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { stockRouter } from "./routers/stock";
import { watchlistRouter } from "./routers/watchlist";
import { signalsRouter } from "./routers/signals";
import { backtestRouter } from "./routers/backtest";
import { aiRouter } from "./routers/ai";
import { newsRouter } from "./routers/news";
import { macroRouter } from "./routers/macro";
import {
  scannerRouter,
  tradeGuideRouter,
  scanHistoryRouter,
} from "./routers/scanner";
import { portfolioRouter } from "./routers/portfolio";
import { alertsRouter } from "./routers/alerts";
import { tradeLogsRouter } from "./routers/tradeLogs";
import { chartPatternRouter } from "./routers/chartPattern";
import { signalPerformanceRouter } from "./routers/signalPerformance";
import { chatRouter } from "./routers/chat";
import { notesRouter } from "./routers/notes";
import { insightsRouter } from "./routers/insights";
import { divergenceRouter } from "./routers/divergence";
import { advancedRouter } from "./routers/advanced";



export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  stock: stockRouter,
  watchlist: watchlistRouter,
  signals: signalsRouter,
  backtest: backtestRouter,
  ai: aiRouter,
  news: newsRouter,
  macro: macroRouter,
  scanner: scannerRouter,
  tradeGuide: tradeGuideRouter,
  scanHistory: scanHistoryRouter,
  portfolio: portfolioRouter,
  alerts: alertsRouter,
  tradeLogs: tradeLogsRouter,
  chartPattern: chartPatternRouter,
  signalPerformance: signalPerformanceRouter,
  chat: chatRouter,
  insights: insightsRouter,
  notes: notesRouter,
  divergence: divergenceRouter,
  advanced: advancedRouter,
});



export type AppRouter = typeof appRouter;
