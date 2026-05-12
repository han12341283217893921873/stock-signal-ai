import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "../../shared/const.js";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context.js";
import { checkRateLimit, getClientIp } from "./rateLimit.js";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export { t };

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  })
);

/** AI/LLM 호출 전용 프로시저 - 분당 10회 제한 */
export const aiProcedure = t.procedure.use(
  t.middleware(async ({ ctx, next }) => {
    const ip = getClientIp(ctx.req);
    const userId = ctx.user?.id ?? "anon";
    checkRateLimit(`ai:${userId}:${ip}`, 10, 60 * 1000);
    return next();
  })
);

/** 스캐너 전용 프로시저 - 분당 3회 제한 */
export const scannerProcedure = t.procedure.use(
  t.middleware(async ({ ctx, next }) => {
    const ip = getClientIp(ctx.req);
    const userId = ctx.user?.id ?? "anon";
    checkRateLimit(`scanner:${userId}:${ip}`, 3, 60 * 1000);
    return next();
  })
);
