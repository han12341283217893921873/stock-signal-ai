import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";
import { getPortfolioPositions } from "../db";
import { getFearGreedIndex, getQuote } from "../finnhub";

export const chatRouter = router({
  ask: protectedProcedure
    .input(
      z.object({
        message: z.string(),
        history: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const positions = await getPortfolioPositions(userId);
      const fearGreed = await getFearGreedIndex();

      // 포트폴리오 요약 문자열 생성
      const portfolioSummary = positions
        .map(p => `${p.ticker}: ${p.quantity}주`)
        .join(", ");

      const systemPrompt = `당신은 'Stock Signal AI' 시스템의 전문 투자 어시스턴트입니다.
사용자의 질문에 답변할 때 다음 정보를 참고하세요:
- 사용자의 현재 포트폴리오: ${portfolioSummary || "보유 종목 없음"}
- 시장 공포와 탐욕 지수: ${fearGreed.score} (${fearGreed.label})

답변 원칙:
1. 전문적이고 분석적이며 정중한 톤을 유지하세요.
2. 매크로 상황과 포트폴리오의 관계를 고려하여 답변하세요.
3. 투자 권유가 아닌 분석 정보임을 명시하세요.
4. 가능한 구체적인 수치나 근거를 들어 설명하세요.
5. 한국어로 답변하세요.`;

      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...(input.history || []).map(h => ({
          role: h.role,
          content: h.content,
        })),
        { role: "user" as const, content: input.message },
      ];

      try {
        const result = await invokeLLM({
          messages,
          maxTokens: 1000,
        });

        return {
          answer: result.choices[0].message.content,
        };
      } catch (err) {
        console.error("[ChatRouter] LLM error:", err);
        return {
          answer:
            "죄송합니다. AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        };
      }
    }),
});
