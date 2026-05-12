#!/usr/bin/env node
/**
 * Finnhub API Integration Test
 * Tests Finnhub data retrieval, Korean stock support, and technical indicators
 */

import * as dotenv from "dotenv";
import axios from "axios";

dotenv.config({ path: ".env.local" });

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_API_BASE = "https://finnhub.io/api/v1";

if (!FINNHUB_API_KEY) {
  console.error("❌ FINNHUB_API_KEY 환경변수가 설정되지 않았습니다!");
  process.exit(1);
}

console.log("🧪 Finnhub API 통합 테스트 시작...\n");
console.log(
  `📝 API Key: ${FINNHUB_API_KEY.substring(0, 8)}...${FINNHUB_API_KEY.slice(-4)}`
);

// Test 1: US Stock Quote
async function testUSStockQuote() {
  console.log("\n📊 [TEST 1] US 주식 시세 조회: AAPL");
  try {
    const response = await axios.get(`${FINNHUB_API_BASE}/quote`, {
      params: {
        symbol: "AAPL",
        token: FINNHUB_API_KEY,
      },
    });
    console.log("✅ 성공!");
    console.log(`   현재 가격: $${response.data.c}`);
    console.log(`   고가(오늘): $${response.data.h}`);
    console.log(`   저가(오늘): $${response.data.l}`);
    console.log(`   종가(전일): $${response.data.pc}`);
    console.log(
      `   타임스탬프: ${new Date(response.data.t * 1000).toISOString()}`
    );
    return response.data;
  } catch (error: any) {
    console.error("❌ 실패:", error.message);
    if (error.response?.data) {
      console.error("   응답:", error.response.data);
    }
    return null;
  }
}

// Test 2: Korean Stock Quote
async function testKoreanStockQuote() {
  console.log("\n📊 [TEST 2] 한국 주식 시세 조회: 삼성전자 (005930.KS)");
  try {
    const response = await axios.get(`${FINNHUB_API_BASE}/quote`, {
      params: {
        symbol: "005930.KS",
        token: FINNHUB_API_KEY,
      },
    });
    console.log("✅ 성공!");
    console.log(`   현재 가격: ₩${response.data.c}`);
    console.log(`   고가(오늘): ₩${response.data.h}`);
    console.log(`   저가(오늘): ₩${response.data.l}`);
    console.log(`   종가(전일): ₩${response.data.pc}`);
    console.log(
      `   타임스탬프: ${new Date(response.data.t * 1000).toISOString()}`
    );
    return response.data;
  } catch (error: any) {
    console.error("❌ 실패:", error.message);
    if (error.response?.data) {
      console.error("   응답:", error.response.data);
    }
    return null;
  }
}

// Test 3: Historical Data
async function testHistoricalData() {
  console.log("\n📈 [TEST 3] 과거 데이터 조회: AAPL 일봉 데이터 (30일)");
  try {
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - 30 * 24 * 60 * 60; // 30일 전

    const response = await axios.get(`${FINNHUB_API_BASE}/stock/candle`, {
      params: {
        symbol: "AAPL",
        resolution: "D", // Daily
        from: startTime,
        to: endTime,
        token: FINNHUB_API_KEY,
      },
    });

    if (response.data.c && response.data.c.length > 0) {
      console.log("✅ 성공!");
      console.log(`   수집된 캔들 수: ${response.data.c.length}개`);
      const latest = response.data.c.length - 1;
      console.log(
        `   최신 캔들 (날짜: ${new Date(response.data.t[latest] * 1000).toISOString().split("T")[0]}):`
      );
      console.log(`     Open: $${response.data.o[latest].toFixed(2)}`);
      console.log(`     High: $${response.data.h[latest].toFixed(2)}`);
      console.log(`     Low: $${response.data.l[latest].toFixed(2)}`);
      console.log(`     Close: $${response.data.c[latest].toFixed(2)}`);
      console.log(`     Volume: ${response.data.v[latest].toLocaleString()}`);
      return response.data;
    } else {
      console.log("⚠️  데이터 없음");
      return null;
    }
  } catch (error: any) {
    console.error("❌ 실패:", error.message);
    if (error.response?.data) {
      console.error("   응답:", error.response.data);
    }
    return null;
  }
}

// Test 4: Stock Search (US) - Company Name
async function testStockSearch() {
  console.log("\n🔍 [TEST 4] 주식 검색 (회사명): 'Apple'");
  try {
    const response = await axios.get(`${FINNHUB_API_BASE}/search`, {
      params: {
        q: "Apple",
        token: FINNHUB_API_KEY,
      },
    });

    if (response.data.result && response.data.result.length > 0) {
      console.log("✅ 성공!");
      console.log(`   검색 결과: ${response.data.result.length}개`);
      response.data.result.slice(0, 5).forEach((r: any, i: number) => {
        console.log(`   ${i + 1}. ${r.symbol} - ${r.description}`);
      });
      return response.data;
    } else {
      console.log("⚠️  검색 결과 없음");
      return null;
    }
  } catch (error: any) {
    console.error("❌ 실패:", error.message);
    if (error.response?.data) {
      console.error("   응답:", error.response.data);
    }
    return null;
  }
}

// Test 4B: Stock Search (US) - Ticker Symbol
async function testTickerSearch() {
  console.log("\n🔍 [TEST 4B] 주식 검색 (티커): 'AAPL', 'TSLA'");
  try {
    // Test AAPL
    console.log("\n   Testing AAPL search:");
    const appleResponse = await axios.get(`${FINNHUB_API_BASE}/search`, {
      params: {
        q: "AAPL",
        token: FINNHUB_API_KEY,
      },
    });

    console.log(
      `   Raw response for AAPL:`,
      JSON.stringify(appleResponse.data, null, 2)
    );

    if (appleResponse.data.result && appleResponse.data.result.length > 0) {
      console.log("   ✅ AAPL 검색 성공!");
      console.log(`      결과: ${appleResponse.data.result.length}개`);
      appleResponse.data.result.slice(0, 3).forEach((r: any, i: number) => {
        console.log(
          `      ${i + 1}. ${r.symbol} - ${r.description} (${r.type})`
        );
      });
    } else {
      console.log("   ⚠️ AAPL 검색 결과 없음");
    }

    // Test TSLA
    console.log("\n   Testing TSLA search:");
    const teslaResponse = await axios.get(`${FINNHUB_API_BASE}/search`, {
      params: {
        q: "TSLA",
        token: FINNHUB_API_KEY,
      },
    });

    console.log(
      `   Raw response for TSLA:`,
      JSON.stringify(teslaResponse.data, null, 2)
    );

    if (teslaResponse.data.result && teslaResponse.data.result.length > 0) {
      console.log("   ✅ TSLA 검색 성공!");
      console.log(`      결과: ${teslaResponse.data.result.length}개`);
      teslaResponse.data.result.slice(0, 3).forEach((r: any, i: number) => {
        console.log(
          `      ${i + 1}. ${r.symbol} - ${r.description} (${r.type})`
        );
      });
    } else {
      console.log("   ⚠️ TSLA 검색 결과 없음");
    }

    return { apple: appleResponse.data, tesla: teslaResponse.data };
  } catch (error: any) {
    console.error("❌ 실패:", error.message);
    if (error.response?.data) {
      console.error("   응답:", error.response.data);
    }
    return null;
  }
}

// Test 5: Technical Indicators Calculation
async function calculateTechnicalIndicators() {
  console.log("\n🔧 [TEST 5] 기술 지표 계산: AAPL RSI, MACD, 이동평균");

  try {
    // 90일 데이터 수집 (다양한 지표 계산을 위해)
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - 90 * 24 * 60 * 60;

    const response = await axios.get(`${FINNHUB_API_BASE}/stock/candle`, {
      params: {
        symbol: "AAPL",
        resolution: "D",
        from: startTime,
        to: endTime,
        token: FINNHUB_API_KEY,
      },
    });

    if (!response.data.c || response.data.c.length < 14) {
      console.log("⚠️  데이터 부족 (최소 14개 필요)");
      return null;
    }

    const closes = response.data.c;

    // RSI 계산 (14-period)
    const calculateRSI = (closes: number[], period = 14) => {
      if (closes.length < period + 1) return null;

      let gains = 0,
        losses = 0;
      for (let i = closes.length - period; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1];
        if (change > 0) gains += change;
        else losses += Math.abs(change);
      }

      const avgGain = gains / period;
      const avgLoss = losses / period;

      if (avgLoss === 0) return 100;
      const rs = avgGain / avgLoss;
      return 100 - 100 / (1 + rs);
    };

    // SMA 계산
    const calculateSMA = (closes: number[], period: number) => {
      if (closes.length < period) return null;
      const sum = closes.slice(-period).reduce((a, b) => a + b, 0);
      return sum / period;
    };

    // EMA 계산
    const calculateEMA = (closes: number[], period: number) => {
      if (closes.length < period) return null;
      const k = 2 / (period + 1);
      let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
      for (let i = period; i < closes.length; i++) {
        ema = closes[i] * k + ema * (1 - k);
      }
      return ema;
    };

    const rsi = calculateRSI(closes);
    const sma20 = calculateSMA(closes, 20);
    const sma50 = calculateSMA(closes, 50);
    const ema12 = calculateEMA(closes, 12);
    const ema26 = calculateEMA(closes, 26);

    console.log("✅ 성공!");
    console.log(`   데이터 포인트: ${closes.length}개`);
    console.log(`   최신 종가: $${closes[closes.length - 1].toFixed(2)}`);
    console.log(`   RSI (14): ${rsi?.toFixed(2)}`);
    console.log(`   SMA (20): $${sma20?.toFixed(2)}`);
    console.log(`   SMA (50): $${sma50?.toFixed(2)}`);
    console.log(`   EMA (12): $${ema12?.toFixed(2)}`);
    console.log(`   EMA (26): $${ema26?.toFixed(2)}`);

    return { rsi, sma20, sma50, ema12, ema26 };
  } catch (error: any) {
    console.error("❌ 실패:", error.message);
    return null;
  }
}

// Run all tests
async function runAllTests() {
  console.log("═".repeat(60));

  const results = {
    usQuote: await testUSStockQuote(),
    krQuote: await testKoreanStockQuote(),
    historical: await testHistoricalData(),
    search: await testStockSearch(),
    tickerSearch: await testTickerSearch(),
    indicators: await calculateTechnicalIndicators(),
  };

  console.log("\n" + "═".repeat(60));
  console.log("📋 테스트 결과 요약:\n");

  let passCount = 0;
  const tests = [
    { name: "US 주식 시세", result: results.usQuote },
    { name: "한국 주식 시세", result: results.krQuote },
    { name: "과거 데이터", result: results.historical },
    { name: "주식 검색 (회사명)", result: results.search },
    { name: "주식 검색 (티커)", result: results.tickerSearch },
    { name: "기술 지표", result: results.indicators },
  ];

  tests.forEach(test => {
    if (test.result) {
      console.log(`✅ ${test.name}: 통과`);
      passCount++;
    } else {
      console.log(`❌ ${test.name}: 실패`);
    }
  });

  console.log(`\n📊 총 ${passCount}/${tests.length}개 테스트 통과\n`);

  if (passCount === tests.length) {
    console.log("🎉 완벽하게 실행되는 것까지 확인되었습니다!");
    console.log("   ✅ Finnhub API 통합 완료");
    console.log("   ✅ US 주식 데이터 조회 정상");
    console.log("   ✅ 한국 주식 데이터 조회 정상");
    console.log("   ✅ 과거 데이터 조회 정상");
    console.log("   ✅ 기술 지표 계산 정상");
    process.exit(0);
  } else {
    console.log("⚠️  일부 테스트가 실패했습니다.");
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error("❌ 테스트 실행 중 오류:", err);
  process.exit(1);
});
