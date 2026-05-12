/**
 * 신호 성과 자동 업데이트 스케줄러
 * - 7일 이상 경과한 pending 신호의 현재가를 조회하여 수익률 자동 기록
 * - 14일/30일 후에도 재평가하여 업데이트
 */
import { getPendingSignalPerformances, updateSignalPerformance } from "./db";
import { getQuote } from "./finnhub";

const EVAL_INTERVAL_MS = 30 * 60 * 1000; // 30분 간격

async function evaluatePendingSignals() {
  try {
    // 7일 이상 경과한 pending 신호 조회
    const pending = await getPendingSignalPerformances(7);
    if (pending.length === 0) return;

    console.log(`[SignalPerformance] ${pending.length}개 대기 신호 평가 시작`);

    // 티커별로 그룹화하여 quote 호출 최소화
    const tickerMap = new Map<string, typeof pending>();
    for (const p of pending) {
      const list = tickerMap.get(p.ticker) || [];
      list.push(p);
      tickerMap.set(p.ticker, list);
    }

    for (const [ticker, records] of Array.from(tickerMap.entries())) {
      try {
        const quote = await getQuote(ticker);
        const currentPrice = (quote as any)?.regularMarketPrice;
        if (!currentPrice || currentPrice <= 0) continue;

        for (const record of records) {
          const entryPrice = Number(record.entryPrice);
          if (entryPrice <= 0) continue;

          const daysHeld = Math.floor(
            (Date.now() - new Date(record.createdAt).getTime()) /
              (24 * 60 * 60 * 1000)
          );

          // 매수 신호: 현재가 - 진입가 = 수익
          // 매도 신호: 진입가 - 현재가 = 수익 (공매도 관점)
          const isBuy = record.signalType === "buy";
          const profitLoss = isBuy
            ? currentPrice - entryPrice
            : entryPrice - currentPrice;
          const profitLossPercent = (profitLoss / entryPrice) * 100;

          await updateSignalPerformance(record.id, {
            exitPrice: currentPrice,
            profitLoss: Number(profitLoss.toFixed(4)),
            profitLossPercent: Number(profitLossPercent.toFixed(4)),
            daysHeld,
            status: "closed",
          });
        }

        // Yahoo Finance rate limit 방지
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.error(`[SignalPerformance] ${ticker} 평가 실패:`, err);
      }
    }

    console.log(`[SignalPerformance] 평가 완료`);
  } catch (err) {
    console.error("[SignalPerformance] 스케줄러 오류:", err);
  }
}

export function startSignalPerformanceScheduler() {
  console.log("[SignalPerformance] 스케줄러 시작 - 30분 간격으로 성과 평가");
  // 서버 시작 2분 후 첫 실행
  setTimeout(
    () => {
      evaluatePendingSignals();
      setInterval(evaluatePendingSignals, EVAL_INTERVAL_MS);
    },
    2 * 60 * 1000
  );
}
