import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance();

// 1. 현재 시세 확인
console.log("=== 삼성전자(005930.KS) 실제 Yahoo Finance 데이터 ===\n");
try {
  const quote = await yf.quote("005930.KS");
  console.log("현재가:", quote.regularMarketPrice);
  console.log("통화:", quote.currency);
  console.log("시장:", quote.fullExchangeName);
  console.log("종목명:", quote.shortName || quote.longName);
  console.log("전일 종가:", quote.regularMarketPreviousClose);
  console.log(
    "변동률:",
    (quote.regularMarketChangePercent ?? 0).toFixed(2) + "%"
  );
  console.log("거래량:", quote.regularMarketVolume);
  console.log("52주 최고:", quote.fiftyTwoWeekHigh);
  console.log("52주 최저:", quote.fiftyTwoWeekLow);
  console.log("시가총액:", quote.marketCap);
} catch (e) {
  console.log("quote 에러:", e.message);
}

// 2. 최근 과거 데이터 확인
console.log("\n=== 최근 과거 데이터 (일봉) ===");
try {
  const hist = await yf.chart("005930.KS", {
    period1: "2026-04-01",
    period2: "2026-04-19",
    interval: "1d",
  });
  const quotes = hist.quotes;
  for (const q of quotes) {
    const dateStr = new Date(q.date).toISOString().split("T")[0];
    console.log(
      `${dateStr} | 시가: ${q.open} | 고가: ${q.high} | 저가: ${q.low} | 종가: ${q.close} | 거래량: ${q.volume}`
    );
  }
} catch (e) {
  console.log("chart 에러:", e.message);
}

// 3. 6개월 데이터로 기술적 지표 검증
console.log("\n=== 6개월 데이터 기술적 지표 검증 ===");
try {
  const hist = await yf.chart("005930.KS", {
    period1: "2025-10-01",
    period2: "2026-04-19",
    interval: "1d",
  });
  const quotes = hist.quotes;
  const closes = quotes.map(q => q.close).filter(c => c != null);

  console.log("총 데이터 포인트:", closes.length);
  console.log("최근 종가:", closes[closes.length - 1]);
  console.log("6개월 최고:", Math.max(...closes));
  console.log("6개월 최저:", Math.min(...closes));

  // RSI 계산 (14일)
  if (closes.length >= 15) {
    let gains = 0,
      losses = 0;
    for (let i = closes.length - 14; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff > 0) gains += diff;
      else losses += Math.abs(diff);
    }
    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    console.log("RSI(14):", rsi.toFixed(2));
  }

  // MA 계산
  if (closes.length >= 60) {
    const ma5 = closes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const ma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const ma60 = closes.slice(-60).reduce((a, b) => a + b, 0) / 60;
    console.log("MA5:", ma5.toFixed(0));
    console.log("MA20:", ma20.toFixed(0));
    console.log("MA60:", ma60.toFixed(0));
  }

  // MACD 계산 (12, 26, 9)
  if (closes.length >= 35) {
    // Simple EMA approximation
    const ema = (data, period) => {
      const k = 2 / (period + 1);
      let emaVal = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
      for (let i = period; i < data.length; i++) {
        emaVal = data[i] * k + emaVal * (1 - k);
      }
      return emaVal;
    };
    const ema12 = ema(closes, 12);
    const ema26 = ema(closes, 26);
    const macd = ema12 - ema26;
    console.log("MACD (EMA12-EMA26):", macd.toFixed(2));
    console.log("EMA12:", ema12.toFixed(0));
    console.log("EMA26:", ema26.toFixed(0));
  }
} catch (e) {
  console.log("chart 에러:", e.message);
}
