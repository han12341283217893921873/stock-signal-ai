import { protectedProcedure, router } from "../_core/trpc.js";
import { z } from "zod";
import { runAutoPilot } from "../autopilot.js";
import { getUserById, updateUserAutopilot } from "../db.js";

export const autopilotRouter = router({
  /** 오토파일럿 상태 조회 */
  status: protectedProcedure.query(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id);
    return {
      enabled: (user as any)?.autopilotEnabled === 1,
      cashBalance: user?.cashBalance ?? 0,
      realizedPnl: user?.realizedPnl ?? 0,
    };
  }),

  /** 오토파일럿 활성화/비활성화 */
  toggle: protectedProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await updateUserAutopilot(ctx.user.id, input.enabled ? 1 : 0);
      return { success: true, enabled: input.enabled };
    }),

  /** 오토파일럿 수동 실행 (즉시 1회) */
  runNow: protectedProcedure.mutation(async ({ ctx }) => {
    await runAutoPilot(ctx.user.id);
    return { success: true };
  }),
});
