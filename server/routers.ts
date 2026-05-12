import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies.js";
import { systemRouter } from "./_core/systemRouter.js";
import { publicProcedure, router } from "./_core/trpc.js";
import { stockRouter } from "./routers/stock.js";
import { watchlistRouter } from "./routers/watchlist.js";
import { signalsRouter } from "./routers/signals.js";
import { backtestRouter } from "./routers/backtest.js";
import { aiRouter } from "./routers/ai.js";
import { newsRouter } from "./routers/news.js";
import { macroRouter } from "./routers/macro.js";
import {
  scannerRouter,
  tradeGuideRouter,
  scanHistoryRouter,
} from "./routers/scanner.js";
import { portfolioRouter } from "./routers/portfolio.js";
import { alertsRouter } from "./routers/alerts.js";
import { tradeLogsRouter } from "./routers/tradeLogs.js";
import { chartPatternRouter } from "./routers/chartPattern.js";
import { signalPerformanceRouter } from "./routers/signalPerformance.js";
import { chatRouter } from "./routers/chat.js";
import { notesRouter } from "./routers/notes.js";
import { insightsRouter } from "./routers/insights.js";
import { divergenceRouter } from "./routers/divergence.js";
import { advancedRouter } from "./routers/advanced.js";

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
