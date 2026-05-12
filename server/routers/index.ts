import { router } from "./../_core/trpc";
import { stockRouter } from "./stock";
import { watchlistRouter } from "./watchlist";
import { signalsRouter } from "./signals";
import { backtestRouter } from "./backtest";
import { aiRouter } from "./ai";
import { newsRouter } from "./news";
import { macroRouter } from "./macro";
import { scannerRouter, tradeGuideRouter, scanHistoryRouter } from "./scanner";
import { portfolioRouter } from "./portfolio";
import { alertsRouter } from "./alerts";
import { tradeLogsRouter } from "./tradeLogs";
import { chartPatternRouter } from "./chartPattern";
import { signalPerformanceRouter } from "./signalPerformance";
import { chatRouter } from "./chat";
import { insightsRouter } from "./insights";

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
