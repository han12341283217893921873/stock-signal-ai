import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  setWatchlistTag,
} from "../db";
import { registerPrefetchTicker, unregisterPrefetchTicker } from "../finnhub";

export const watchlistRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    // 세션이 없는 경우 빈 배열 반환 (401 방지)
    if (!ctx.user) return [];
    return getWatchlist(ctx.user.id);
  }),

  add: protectedProcedure
    .input(
      z.object({
        ticker: z.string().min(1).max(20),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await addToWatchlist({
        userId: ctx.user.id,
        ticker: input.ticker.toUpperCase(),
        name: input.name || null,
      });
      registerPrefetchTicker(input.ticker.toUpperCase());
      return result;
    }),

  remove: protectedProcedure
    .input(z.object({ ticker: z.string().min(1).max(20) }))
    .mutation(async ({ ctx, input }) => {
      await removeFromWatchlist(ctx.user.id, input.ticker.toUpperCase());
      unregisterPrefetchTicker(input.ticker.toUpperCase());
      return { success: true };
    }),

  registerPrefetch: protectedProcedure
    .input(z.object({ tickers: z.array(z.string()).max(50) }))
    .mutation(async ({ input }) => {
      input.tickers.forEach(t => registerPrefetchTicker(t));
      return { success: true };
    }),

  setTag: protectedProcedure
    .input(
      z.object({
        ticker: z.string().min(1).max(20),
        tag: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await setWatchlistTag(ctx.user.id, input.ticker.toUpperCase(), input.tag);
      return { success: true };
    }),

  toggle: protectedProcedure
    .input(
      z.object({
        ticker: z.string().min(1).max(20),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ticker = input.ticker.toUpperCase();
      const existing = await getWatchlist(ctx.user.id);
      const isOnList = existing.some(i => i.ticker === ticker);

      if (isOnList) {
        await removeFromWatchlist(ctx.user.id, ticker);
        unregisterPrefetchTicker(ticker);
        return { added: false };
      } else {
        await addToWatchlist({
          userId: ctx.user.id,
          ticker,
          name: input.name || null,
        });
        registerPrefetchTicker(ticker);
        return { added: true };
      }
    }),
});
