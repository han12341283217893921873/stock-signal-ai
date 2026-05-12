import { getQuote } from "../server/yahoo";

async function main() {
  const quote1 = await getQuote("005930.KS");
  console.log("Samsung:", quote1.symbol, quote1.shortName, quote1.regularMarketPrice);

  const quote2 = await getQuote("035420.KS");
  console.log("Naver:", quote2.symbol, quote2.shortName, quote2.regularMarketPrice);
  
  const quote3 = await getQuote("000020.KS"); // 동화약품 (not in POPULAR_KR_STOCKS)
  console.log("Other:", quote3.symbol, quote3.shortName, quote3.regularMarketPrice);
}

main().catch(console.error);
