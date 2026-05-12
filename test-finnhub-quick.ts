#!/usr/bin/env node
import "dotenv/config";
import { getQuote, getCompanyNews, getGeneralNews } from "./server/finnhub";

async function run() {
  console.log("=== Finnhub Quick Validation ===");
  try {
    console.log("\n[1] 한국 주식 티커 조회 (005930.KS)");
    const krQuote = await getQuote("005930.KS");
    console.log(
      JSON.stringify(
        {
          price: krQuote.regularMarketPrice,
          currency: krQuote.currency,
          name: krQuote.shortName,
        },
        null,
        2
      )
    );
  } catch (err) {
    console.error("Korean quote failed:", err);
  }

  try {
    console.log("\n[2] 종목 뉴스 조회 (AAPL)");
    const news = await getCompanyNews("AAPL");
    console.log(`News count: ${news.length}`);
    console.log(news.slice(0, 3));
  } catch (err) {
    console.error("Company news failed:", err);
  }

  try {
    console.log("\n[3] 일반 시장 뉴스 조회");
    const general = await getGeneralNews();
    console.log(`General news count: ${general.length}`);
    console.log(general.slice(0, 3));
  } catch (err) {
    console.error("General news failed:", err);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
