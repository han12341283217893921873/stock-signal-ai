import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getStockNote, upsertStockNote, deleteStockNote } from "../db";

export const notesRouter = router({
  get: protectedProcedure
    .input(z.object({ ticker: z.string().min(1).max(20) }))
    .query(async ({ ctx, input }) => {
      return getStockNote(ctx.user.id, input.ticker.toUpperCase());
    }),

  upsert: protectedProcedure
    .input(z.object({ ticker: z.string().min(1).max(20), content: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await upsertStockNote(
        ctx.user.id,
        input.ticker.toUpperCase(),
        input.content
      );
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ ticker: z.string().min(1).max(20) }))
    .mutation(async ({ ctx, input }) => {
      await deleteStockNote(ctx.user.id, input.ticker.toUpperCase());
      return { success: true };
    }),
});
