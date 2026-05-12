#!/usr/bin/env node
/**
 * Test finnhub.ts module functions directly
 */

import "dotenv/config";
import {
  isKoreanTicker,
  getCurrencyInfo,
  getMarketLabel,
  getStockSummary,
} from "./server/finnhub";

console.log("🧪 finnhub.ts 모듈 함수 테스트 시작...\n");

// Test 1: isKoreanTicker
console.log("✅ [TEST 1] 한국 주식 티커 판별");
console.log(
  `   isKoreanTicker("005930.KS"): ${isKoreanTicker("005930.KS")} (예상: true)`
);
console.log(
  `   isKoreanTicker("AAPL"): ${isKoreanTicker("AAPL")} (예상: false)`
);
console.log(
  `   isKoreanTicker("035420.KQ"): ${isKoreanTicker("035420.KQ")} (예상: true)`
);

// Test 2: getCurrencyInfo
console.log("\n✅ [TEST 2] 통화 정보 조회");
const krInfo = getCurrencyInfo("005930.KS");
console.log(`   한국 주식: ${JSON.stringify(krInfo)}`);
const usInfo = getCurrencyInfo("AAPL");
console.log(`   US 주식: ${JSON.stringify(usInfo)}`);

// Test 3: getMarketLabel
console.log("\n✅ [TEST 3] 마켓 라벨 조회");
console.log(
  `   getMarketLabel("005930.KS"): ${getMarketLabel("005930.KS")} (예상: KOSPI)`
);
console.log(
  `   getMarketLabel("035420.KQ"): ${getMarketLabel("035420.KQ")} (예상: KOSDAQ)`
);
console.log(`   getMarketLabel("AAPL"): ${getMarketLabel("AAPL")} (예상: US)`);

// Test 4: getStockSummary (실제 API 호출)
console.log("\n🔧 [TEST 4] 전체 주식 데이터 조회: AAPL");
try {
  const summary = await getStockSummary("AAPL");
  if (summary) {
    console.log("✅ 성공! 반환된 데이터:");
    console.log(`   Symbol: ${summary.symbol}`);
    console.log(`   Price: ${summary.price}`);
    console.log(`   Currency: ${summary.currency}`);
    console.log(`   Market: ${summary.market}`);
    console.log(`   Type: ${summary.type}`);
    console.log(`   Signal Grade: ${summary.signalGrade}`);
    console.log(`   Signal Type: ${summary.signalType}`);
    if (summary.indicators) {
      console.log(
        `   Indicators 계산됨: ${Object.keys(summary.indicators).join(", ")}`
      );
    }
  } else {
    console.log("⚠️  null 반환됨");
  }
} catch (error: any) {
  console.error("❌ 오류:", error.message);
}

console.log("\n🎉 모듈 함수 테스트 완료!");
