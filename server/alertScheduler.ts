/**
 * Alert Scheduler
 * 2분마다 활성화된 알림 조건을 자동으로 평가하여 조건 충족 시 notifyOwner를 호출합니다.
 * 매일 자정에는 모든 활성 사용자의 포트폴리오 스냅샷을 자동으로 생성합니다.
 */
import {
  getActiveAlertConditions,
  updateAlertLastTriggered,
  addAlertHistory,
  getPortfolioPositions,
  savePortfolioSnapshot,
  getDb,
} from "./db";
import { getStockSummary, getQuote } from "./finnhub";
import { notifyOwner } from "./_core/notification";
import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";

const INTERVAL_MS = 2 * 60 * 1000; // 2분 (장중 빠른 알림 대응)
const COOLDOWN_MS = 10 * 60 * 1000; // 10분 재발송 방지

async function evaluateAllAlerts() {
  try {
    const conditions = await getActiveAlertConditions();
    if (conditions.length === 0) return;

    // 중복 ticker 제거하여 한 번씩만 API 호출
    const uniqueTickers = Array.from(new Set(conditions.map(c => c.ticker)));
    const summaryMap = new Map<
      string,
      Awaited<ReturnType<typeof getStockSummary>>
    >();

    await Promise.allSettled(
      uniqueTickers.map(async ticker => {
        try {
          const summary = await getStockSummary(ticker);
          summaryMap.set(ticker, summary);
        } catch {
          // 개별 티커 실패는 무시
        }
      })
    );

    for (const cond of conditions) {
      const summary = summaryMap.get(cond.ticker);
      if (!summary) continue;

      // 마지막 트리거로부터 10분 이상 경과한 경우만 재발송 (스팸 방지)
      if (cond.lastTriggeredAt) {
        const elapsed = Date.now() - new Date(cond.lastTriggeredAt).getTime();
        if (elapsed < COOLDOWN_MS) continue;
      }

      let triggered = false;
      let triggerMsg = "";

      switch (cond.conditionType) {
        case "rsi_below":
          if (
            summary.indicators.rsi != null &&
            summary.indicators.rsi <= Number(cond.threshold)
          ) {
            triggered = true;
            triggerMsg = `RSI ${summary.indicators.rsi.toFixed(1)} ≤ ${cond.threshold} (과매도 구간)`;
          }
          break;
        case "rsi_above":
          if (
            summary.indicators.rsi != null &&
            summary.indicators.rsi >= Number(cond.threshold)
          ) {
            triggered = true;
            triggerMsg = `RSI ${summary.indicators.rsi.toFixed(1)} ≥ ${cond.threshold} (과매수 구간)`;
          }
          break;
        case "signal_strength_above":
          if (summary.signal.strength >= Number(cond.threshold)) {
            triggered = true;
            triggerMsg = `신호 강도 ${summary.signal.strength} ≥ ${cond.threshold} (${summary.signal.type === "buy" ? "매수" : "매도"} 신호)`;
          }
          break;
        case "price_above":
          if (summary.price >= Number(cond.threshold)) {
            triggered = true;
            triggerMsg = `현재가 ${summary.price.toLocaleString()} ≥ ${Number(cond.threshold).toLocaleString()} (상단 돌파)`;
          }
          break;
        case "price_below":
          if (summary.price <= Number(cond.threshold)) {
            triggered = true;
            triggerMsg = `현재가 ${summary.price.toLocaleString()} ≤ ${Number(cond.threshold).toLocaleString()} (하단 돌파)`;
          }
          break;
        case "complex":
          if (cond.conditionJson) {
            try {
              const rules = JSON.parse(cond.conditionJson);
              triggered = rules.every((rule: any) => {
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
              if (triggered)
                triggerMsg = `복합 조건 (${rules.length}개) 모두 충족`;
            } catch (e) {
              console.error(
                "[AlertScheduler] Failed to parse complex condition:",
                e
              );
            }
          }
          break;
      }

      if (triggered) {
        await notifyOwner({
          title: `🔔 [${cond.ticker}] 알림 조건 충족`,
          content: `${cond.ticker} (${summary.name})\n${triggerMsg}\n현재가: ${summary.price.toLocaleString()} | 신호: ${summary.signal.type} (강도 ${summary.signal.strength})`,
        });
        await updateAlertLastTriggered(cond.id);
        // 알림 히스토리 저장
        await addAlertHistory({
          userId: cond.userId,
          alertConditionId: cond.id,
          ticker: cond.ticker,
          conditionType: cond.conditionType,
          message: triggerMsg,
        });
        console.log(
          `[AlertScheduler] 알림 발송: ${cond.ticker} - ${triggerMsg}`
        );
      }
    }
  } catch (err) {
    console.error("[AlertScheduler] 평가 중 오류:", err);
  }
}

/**
 * 포트폴리오 자동 스냅샷 생성
 * 모든 활성 사용자의 포트폴리오를 순회하여 현재가 기반 가치를 계산하고 스냅샷을 저장합니다.
 */
async function runPortfolioSnapshotForAllUsers() {
  try {
    const db = await getDb();
    if (!db) return;

    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);

    // 모든 사용자 조회
    const allUsers = await db.select({ id: users.id }).from(users);
    console.log(
      `[PortfolioSnapshot] ${allUsers.length}명 사용자 스냅샷 시작: ${dateStr}`
    );

    for (const user of allUsers) {
      try {
        const positions = await getPortfolioPositions(user.id);
        if (positions.length === 0) continue;

        // 각 포지션의 현재가 조회
        const uniqueTickers = Array.from(new Set(positions.map(p => p.ticker)));
        const priceMap = new Map<string, number>();

        await Promise.allSettled(
          uniqueTickers.map(async ticker => {
            try {
              const quote = await getQuote(ticker);
              const price = (quote as any)?.regularMarketPrice ?? 0;
              if (price > 0) priceMap.set(ticker, price);
            } catch {
              // 개별 티커 실패는 무시
            }
          })
        );

        // 포트폴리오 총 가치 및 투자 원금 계산
        let totalValue = 0;
        let totalInvested = 0;

        for (const pos of positions) {
          const currentPrice = priceMap.get(pos.ticker) ?? 0;
          const qty = Number(pos.quantity);
          const avgPx = Number(pos.avgPrice);

          totalInvested += avgPx * qty;
          totalValue += currentPrice > 0 ? currentPrice * qty : avgPx * qty;
        }

        if (totalInvested <= 0) continue;

        const pnlPercent = ((totalValue - totalInvested) / totalInvested) * 100;

        await savePortfolioSnapshot({
          userId: user.id,
          totalValue,
          totalInvested,
          pnlPercent: Number(pnlPercent.toFixed(2)),
          snapshotDate: dateStr,
        });

        console.log(
          `[PortfolioSnapshot] 사용자 ${user.id} 스냅샷 저장: 총 가치=${totalValue.toFixed(0)}, 수익률=${pnlPercent.toFixed(2)}%`
        );
      } catch (userErr) {
        console.error(
          `[PortfolioSnapshot] 사용자 ${user.id} 처리 오류:`,
          userErr
        );
      }
    }

    console.log(`[PortfolioSnapshot] 전체 스냅샷 완료: ${dateStr}`);
  } catch (err) {
    console.error("[PortfolioSnapshot] 전체 오류:", err);
  }
}

export function startAlertScheduler() {
  console.log(
    `[AlertScheduler] 시작 - ${INTERVAL_MS / 60000}분 간격으로 알림 조건 평가 (재발송 방지: ${COOLDOWN_MS / 60000}분)`
  );
  // 서버 시작 후 1분 뒤 첫 실행 (초기 데이터 로딩 대기)
  setTimeout(() => {
    evaluateAllAlerts();
    setInterval(evaluateAllAlerts, INTERVAL_MS);
  }, 60 * 1000);

  // 포트폴리오 스냅샷 - 1시간마다 체크
  setInterval(
    async () => {
      try {
        await runPortfolioSnapshotForAllUsers();
      } catch (e) {
        console.error("[PortfolioSnapshot] 스케줄러 오류:", e);
      }
    },
    60 * 60 * 1000
  ); // 1시간마다 체크
}
