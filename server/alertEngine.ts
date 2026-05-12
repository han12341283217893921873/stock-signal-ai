import { getActiveAlertConditions, updateAlertLastTriggered } from "./db";
import { notifyOwner } from "./_core/notification";
import { getFearGreedIndex, getQuote } from "./finnhub";

const COOLDOWN_MS = 10 * 60 * 1000; // 10분 재발송 방지
const CACHE_REFRESH_MS = 15 * 1000; // 15초마다 DB에서 알림 조건 동기화

let cachedConditions: any[] = [];
let lastCacheRefresh = 0;
let isRefreshing = false;

let lastMacroData = { vix: 20, fearGreed: 50 };
let lastMacroUpdate = 0;

/** 매크로 데이터 갱신 */
async function refreshMacroData() {
  try {
    const [fg, vixQuote] = await Promise.all([
      getFearGreedIndex(),
      getQuote("^VIX"),
    ]);
    lastMacroData = {
      fearGreed: fg.score,
      vix: (vixQuote as any)?.regularMarketPrice ?? 20,
    };
    lastMacroUpdate = Date.now();
  } catch (err) {
    console.error("[AlertEngine] 매크로 데이터 갱신 오류:", err);
  }
}

/**
 * 알림 조건 캐시 갱신 함수.
 * evaluatePriceAlerts 내부에서 호출하지 않고, 별도 스케줄러로 주기적으로 갱신합니다.
 */
export async function refreshAlertCache() {
  if (isRefreshing) return;
  isRefreshing = true;
  try {
    cachedConditions = await getActiveAlertConditions();
    lastCacheRefresh = Date.now();
  } catch (err) {
    console.error("[AlertEngine] 캐시 갱신 오류:", err);
  } finally {
    isRefreshing = false;
  }
}

// 별도 스케줄러: 15초마다 알림 조건 캐시 자동 갱신
// (evaluatePriceAlerts 호출 흐름과 분리하여 DB 부하 최소화)
setInterval(() => {
  const now = Date.now();
  if (now - lastCacheRefresh >= CACHE_REFRESH_MS) {
    refreshAlertCache();
  }
  if (now - lastMacroUpdate >= 60 * 1000) {
    // 1분마다 매크로 갱신
    refreshMacroData();
  }
}, CACHE_REFRESH_MS);

export async function evaluatePriceAlerts(
  ticker: string,
  currentPrice: number
) {
  try {
    // 캐시가 비어있으면 즉시 갱신 시도
    if (
      cachedConditions.length === 0 &&
      Date.now() - lastCacheRefresh > CACHE_REFRESH_MS
    ) {
      refreshAlertCache(); // await 하지 않음: 비동기로 백그라운드 갱신
    }

    // 캐시가 비어있으면 이번 틱은 스킵 (다음 틱에서 처리)
    if (cachedConditions.length === 0) return;

    const tickerConditions = cachedConditions.filter(
      c => c.ticker === ticker.toUpperCase()
    );
    if (tickerConditions.length === 0) return;

    for (const cond of tickerConditions) {
      // 재발송 쿨다운 체크
      if (cond.lastTriggeredAt) {
        const elapsed = Date.now() - new Date(cond.lastTriggeredAt).getTime();
        if (elapsed < COOLDOWN_MS) continue;
      }

      let triggered = false;
      let triggerMsg = "";
      const threshold = Number(cond.threshold);

      switch (cond.conditionType) {
        case "price_above":
          if (currentPrice >= threshold) {
            triggered = true;
            triggerMsg = `현재가 ${currentPrice.toLocaleString()} ≥ ${threshold.toLocaleString()} (상단 돌파)`;
          }
          break;
        case "price_below":
          if (currentPrice <= threshold) {
            triggered = true;
            triggerMsg = `현재가 ${currentPrice.toLocaleString()} ≤ ${threshold.toLocaleString()} (하단 돌파)`;
          }
          break;
      }

      // 4. 매크로 조건 추가 체크 (있는 경우에만)
      if (
        triggered &&
        cond.macroConditionType &&
        cond.macroThreshold !== null
      ) {
        let macroMatch = false;
        const mThreshold = Number(cond.macroThreshold);
        switch (cond.macroConditionType) {
          case "vix_above":
            macroMatch = lastMacroData.vix >= mThreshold;
            break;
          case "vix_below":
            macroMatch = lastMacroData.vix <= mThreshold;
            break;
          case "fear_greed_above":
            macroMatch = lastMacroData.fearGreed >= mThreshold;
            break;
          case "fear_greed_below":
            macroMatch = lastMacroData.fearGreed <= mThreshold;
            break;
        }
        if (!macroMatch) {
          triggered = false; // 매크로 조건 불충족 시 트리거 무효화
        } else {
          triggerMsg += ` [매크로 조건 충족: ${cond.macroConditionType} ${mThreshold}]`;
        }
      }

      if (triggered) {
        // 알림 발송은 비동기로 처리
        (async () => {
          try {
            // 로컬 캐시에서 즉시 쿨다운 적용 (중복 발송 방지)
            const condId = cond.id;
            cond.lastTriggeredAt = new Date().toISOString();

            await notifyOwner({
              title: `🔔 [${ticker}] 실시간 가격 알림`,
              content: `${ticker} 종목이 설정하신 가격 조건에 도달했습니다.\n${triggerMsg}\n현재가: ${currentPrice.toLocaleString()}`,
            });
            await updateAlertLastTriggered(condId);
            console.log(
              `[AlertEngine] 실시간 알림 발송: ${ticker} - ${triggerMsg}`
            );
          } catch (e) {
            console.error("[AlertEngine] 알림 발송 중 오류:", e);
          }
        })();
      }
    }
  } catch (err) {
    console.error("[AlertEngine] 실시간 알림 평가 중 오류:", err);
  }
}
