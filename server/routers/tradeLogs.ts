import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getTradeLogs, addTradeLog, deleteTradeLog } from "../db";

const GUEST_USER_ID = 1;
const uid = (ctx: { user?: { id: number } | null }) =>
  ctx.user?.id ?? GUEST_USER_ID;

export const tradeLogsRouter = router({
  list: publicProcedure
    .input(z.object({ ticker: z.string().min(1).max(20) }))
    .query(async ({ ctx, input }) => {
      return getTradeLogs(uid(ctx), input.ticker.toUpperCase());
    }),

  add: publicProcedure
    .input(
      z.object({
        ticker: z.string().min(1).max(20),
        type: z.enum(["buy", "sell", "memo"]),
        date: z.number(),
        price: z.number().optional(),
        targetPrice: z.number().optional(),
        stopPrice: z.number().optional(),
        content: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await addTradeLog({
        userId: uid(ctx),
        ticker: input.ticker.toUpperCase(),
        type: input.type,
        date: new Date(input.date),
        price: input.price,
        targetPrice: input.targetPrice,
        stopPrice: input.stopPrice,
        content: input.content,
      });
      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteTradeLog(uid(ctx), input.id);
      return { success: true };
    }),
});
