import { getPortfolioPositions, addPortfolioPosition, removePortfolioPosition, getUserById, updateUserBalance, addTradeLog } from "./db";
import { getQuote, getUsdKrwRate, isKoreanTicker } from "./finnhub";
import { getScanCache } from "./scanner";

/**
 * AI 오토파일럿 실행 로직
 * 1. 매도 관리: 보유 종목의 손절/익절 및 매도 신호를 먼저 체크하여 현금을 확보합니다.
 * 2. 매수 관리: 스캔 결과에서 새로운 강력 매수 신호를 찾아 자동으로 매수합니다.
 */
export async function runAutoPilot(userId: number) {
  console.log(`[AutoPilot] Starting for user ${userId}...`);

  // 1. 사용자 정보 확인
  const user = await getUserById(userId);
  if (!user) {
    console.log(`[AutoPilot] User ${userId} not found.`);
    return;
  }

  // ─── PART 1: 매도 관리 (Exits) ───
  // 매수를 먼저 하면 잔액이 부족해질 수 있으므로, 매도를 먼저 실행하여 현금을 확보합니다.
  await manageExits(userId, user);

  // ─── PART 2: 매수 관리 (Entries) ───
  if (user.cashBalance < 100) {
    console.log(`[AutoPilot] User ${userId} has insufficient balance for new buys.`);
    return;
  }

  // 2. 스캔 결과 가져오기 (미국/한국 합산)
  const scanUs = getScanCache("us");
  const scanKr = getScanCache("kr");
  const allResults = [...scanUs.results, ...scanKr.results];

  // 3. 강력한 신호 필터링 (85점 이상)
  const strongSignals = allResults
    .filter(r => r.signalType === "buy" && r.signalStrength >= 85)
    .sort((a, b) => b.signalStrength - a.signalStrength)
    .slice(0, 3); // 한 번에 최대 3개만

  if (strongSignals.length === 0) {
    console.log(`[AutoPilot] No strong buy signals found for user ${userId}.`);
    return;
  }

  // 4. 보유 중인 종목 제외 및 포트폴리오 비중 확인
  const currentPositions = await getPortfolioPositions(userId);
  const heldTickers = new Set(currentPositions.map(p => p.ticker.toUpperCase()));
  
  // 총 자산 대비 주식 비중 제한 (예: 총 자산의 70%까지만 주식에 투자)
  const totalInvested = currentPositions.reduce((sum, p) => sum + (p.quantity * p.avgPrice), 0);
  const totalAssets = user.cashBalance + totalInvested;
  if (totalAssets > 0 && (totalInvested / totalAssets) > 0.7) {
    console.log(`[AutoPilot] Portfolio exposure too high (${Math.round((totalInvested/totalAssets)*100)}%). Skipping new buys.`);
    return;
  }

  for (const signal of strongSignals) {
    const ticker = signal.ticker.toUpperCase();
    if (heldTickers.has(ticker)) continue;

    try {
      console.log(`[AutoPilot] Attempting to buy ${ticker} for user ${userId}...`);
      
      const isKR = isKoreanTicker(ticker);
      const quote = await getQuote(ticker);
      const price = (quote as any)?.regularMarketPrice ?? signal.price;
      const exchangeRate = isKR ? await getUsdKrwRate() : 1;
      
      // 투자 비중 결정 (잔액의 15% 또는 최대 $2000)
      const investAmountUsd = Math.min(user.cashBalance * 0.15, 2000);
      const investAmountNative = investAmountUsd * exchangeRate;
      const quantity = Math.floor(investAmountNative / price);

      if (quantity <= 0) continue;

      const totalCostUsd = (quantity * price) / exchangeRate;

      // DB 업데이트
      await updateUserBalance(userId, user.cashBalance - totalCostUsd, user.realizedPnl);
      await addPortfolioPosition({
        userId,
        ticker,
        name: signal.name,
        quantity,
        avgPrice: price,
        memo: "AI 오토파일럿 자동 매수",
        entrySignalScore: signal.signalStrength,
      } as any);

      await addTradeLog({
        userId,
        ticker,
        type: "buy",
        date: new Date(),
        price,
        content: `[AutoPilot] AI가 강력 매수 신호(${signal.signalStrength}점)를 감지하여 자동으로 ${quantity}주를 매수했습니다.`,
      });

      console.log(`[AutoPilot] Successfully bought ${quantity} shares of ${ticker} for user ${userId}.`);
      
      // 로컬 상태 업데이트
      user.cashBalance -= totalCostUsd;
      heldTickers.add(ticker);
    } catch (err) {
      console.error(`[AutoPilot] Failed to buy ${ticker}:`, err);
    }
  }
}

/**
 * 보유 종목의 실시간 상태를 체크하여 매도 조건(손절/익절/매도신호) 충족 시 매도합니다.
 */
async function manageExits(userId: number, user: any) {
  const positions = await getPortfolioPositions(userId);
  if (positions.length === 0) return;

  const STOP_LOSS_PCT = -5.0;      // -5% 손절
  const TAKE_PROFIT_PCT = 15.0;    // +15% 익절

  for (const pos of positions) {
    try {
      const ticker = pos.ticker.toUpperCase();
      const isKR = isKoreanTicker(ticker);
      const quote = await getQuote(ticker);
      const currentPrice = (quote as any)?.regularMarketPrice;
      if (!currentPrice) continue;

      const pnlPct = ((currentPrice - pos.avgPrice) / pos.avgPrice) * 100;
      const exchangeRate = isKR ? await getUsdKrwRate() : 1;

      let shouldSell = false;
      let sellReason = "";

      // 1. 손절 체크
      if (pnlPct <= STOP_LOSS_PCT) {
        shouldSell = true;
        sellReason = `손절 라인(${STOP_LOSS_PCT}%) 돌파 (현재 수익률: ${pnlPct.toFixed(2)}%)`;
      }
      // 2. 익절 체크
      else if (pnlPct >= TAKE_PROFIT_PCT) {
        shouldSell = true;
        sellReason = `익절 목표(${TAKE_PROFIT_PCT}%) 달성 (현재 수익률: ${pnlPct.toFixed(2)}%)`;
      }
      // 3. 강력 매도 신호 체크
      else {
        const scanUs = getScanCache("us");
        const scanKr = getScanCache("kr");
        const latestScan = [...scanUs.results, ...scanKr.results].find(r => r.ticker.toUpperCase() === ticker);
        
        if (latestScan && latestScan.signalType === "sell" && latestScan.signalStrength >= 65) {
          shouldSell = true;
          sellReason = `AI 매도 신호 감지 (${latestScan.signalStrength}점)`;
        }
      }

      if (shouldSell) {
        console.log(`[AutoPilot] Selling ${ticker}: ${sellReason}`);
        
        const totalRevenueUsd = (pos.quantity * currentPrice) / exchangeRate;
        const profitUsd = totalRevenueUsd - (pos.quantity * pos.avgPrice) / exchangeRate;

        // DB 업데이트
        await updateUserBalance(userId, user.cashBalance + totalRevenueUsd, (user.realizedPnl || 0) + profitUsd);
        await removePortfolioPosition(userId, pos.id);
        
        await addTradeLog({
          userId,
          ticker,
          type: "sell",
          date: new Date(),
          price: currentPrice,
          content: `[AutoPilot] ${sellReason}. ${pos.quantity}주를 매도하여 ${profitUsd.toFixed(2)} USD 수익을 실현했습니다.`,
        });

        // 로컬 상태 갱신
        user.cashBalance += totalRevenueUsd;
        user.realizedPnl = (user.realizedPnl || 0) + profitUsd;
      }
    } catch (err) {
      console.error(`[AutoPilot] Failed to process exit for ${pos.ticker}:`, err);
    }
  }
}
