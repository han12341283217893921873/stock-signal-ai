import { router } from "./../_core/trpc.js";
import { stockRouter } from "./stock.js";
import { watchlistRouter } from "./watchlist.js";
import { signalsRouter } from "./signals.js";
import { backtestRouter } from "./backtest.js";
import { aiRouter } from "./ai.js";
import { newsRouter } from "./news.js";
import { macroRouter } from "./macro.js";
import { scannerRouter, tradeGuideRouter, scanHistoryRouter } from "./scanner.js";
import { portfolioRouter } from "./portfolio.js";
import { alertsRouter } from "./alerts.js";
import { tradeLogsRouter } from "./tradeLogs.js";
import { chartPatternRouter } from "./chartPattern.js";
import { signalPerformanceRouter } from "./signalPerformance.js";
import { chatRouter } from "./chat.js";
import { insightsRouter } from "./insights.js";

export const appRouter = router({
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
});

export type AppRouter = typeof appRouter;
