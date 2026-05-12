import YahooFinance from "yahoo-finance2";

async function checkPrice() {
  const yahoo = new YahooFinance();
  const res = await yahoo.quote("005930.KS");
  console.log("Yahoo Samsung Price:", res.regularMarketPrice);
}
checkPrice();
