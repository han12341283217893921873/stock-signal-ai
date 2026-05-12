import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  getAlertConditions,
  addAlertCondition,
  toggleAlertCondition,
  removeAlertCondition,
  updateAlertLastTriggered,
  getAlertHistory,
  getUserById,
  updateUserNotificationSettings,
} from "../db";
import { getStockSummary } from "../finnhub";
import { notifyOwner } from "../_core/notification";

export const alertsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getAlertConditions(ctx.user.id);
  }),

  add: protectedProcedure
    .input(
      z.object({
        ticker: z.string().min(1).max(20),
        name: z.string().optional(),
        conditionType: z.enum([
          "rsi_below",
          "rsi_above",
          "signal_strength_above",
          "price_above",
          "price_below",
          "complex",
        ]),
        threshold: z.number(),
        conditionJson: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return addAlertCondition({
        userId: ctx.user.id,
        ticker: input.ticker.toUpperCase(),
        name: input.name,
        conditionType: input.conditionType,
        threshold: input.threshold,
        conditionJson: input.conditionJson,
      });
    }),

  toggle: protectedProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await toggleAlertCondition(ctx.user.id, input.id, input.isActive ? 1 : 0);
      return { success: true };
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await removeAlertCondition(ctx.user.id, input.id);
      return { success: true };
    }),

  /** 알림 조건 평가 */
  evaluate: protectedProcedure
    .input(z.object({ ticker: z.string().min(1).max(20) }))
    .mutation(async ({ ctx, input }) => {
      const ticker = input.ticker.toUpperCase();
      const conditions = (await getAlertConditions(ctx.user.id)).filter(
        c => c.ticker === ticker && c.isActive === 1
      );
      if (conditions.length === 0) return { triggered: [] };

      const summary = await getStockSummary(ticker);
      const triggered: number[] = [];

      // 사용자 알림 채널 정보 조회
      const user = await getUserById(ctx.user.id);

      for (const cond of conditions) {
        const threshold = Number(cond.threshold);
        let met = false;
        switch (cond.conditionType) {
          case "rsi_below":
            met = (summary.indicators?.rsi ?? 50) < threshold;
            break;
          case "rsi_above":
            met = (summary.indicators?.rsi ?? 50) > threshold;
            break;
          case "signal_strength_above":
            met = (summary.signal?.strength ?? 0) > threshold;
            break;
          case "price_above":
            met = summary.price > threshold;
            break;
          case "price_below":
            met = summary.price < threshold;
            break;
          case "complex":
            if (cond.conditionJson) {
              try {
                const rules = JSON.parse(cond.conditionJson);
                // All rules must be met (AND)
                met = rules.every((rule: any) => {
                  const val =
                    rule.type === "rsi"
                      ? summary.indicators?.rsi
                      : rule.type === "macd"
                        ? summary.indicators?.macdHistogram
                        : rule.type === "price"
                          ? summary.price
                          : rule.type === "signal"
                            ? summary.signal?.strength
                            : null;
                  if (val == null) return false;
                  return rule.operator === ">"
                    ? val > rule.value
                    : val < rule.value;
                });
              } catch (e) {
                console.error("Failed to parse complex condition:", e);
              }
            }
            break;
        }
        if (met) {
          triggered.push(cond.id);
          await updateAlertLastTriggered(cond.id);
          await notifyOwner(
            {
              title: `📢 알림 조건 충족: ${ticker}`,
              content: `${cond.name ?? cond.conditionType} 조건이 충족되었습니다.\n현재가: ${summary.price.toLocaleString()} | 임계값: ${threshold}`,
            },
            // 사용자별 채널 정보 전달
            {
              email: user?.notifyEmail,
              webhook: user?.notifyWebhook,
            }
          );
        }
      }
      return { triggered };
    }),

  history: protectedProcedure.query(async ({ ctx }) => {
    return getAlertHistory(ctx.user.id);
  }),

  /** 알림 수신 채널 설정 조회 */
  getNotificationSettings: protectedProcedure.query(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id);
    return {
      notifyEmail: user?.notifyEmail ?? null,
      notifyWebhook: user?.notifyWebhook ?? null,
    };
  }),

  /** 알림 수신 채널 설정 변경 (이메일, 웹훅 URL) */
  setNotificationSettings: protectedProcedure
    .input(
      z.object({
        notifyEmail: z
          .string()
          .email("올바른 이메일 주소를 입력하세요")
          .nullable()
          .optional(),
        notifyWebhook: z
          .string()
          .url("올바른 URL을 입력하세요")
          .nullable()
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await updateUserNotificationSettings(ctx.user.id, {
        notifyEmail: input.notifyEmail,
        notifyWebhook: input.notifyWebhook,
      });
      return { success: true };
    }),
});
