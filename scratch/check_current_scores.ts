import { getStockSummary } from "../server/finnhub";

async function main() {
  const tickers = ["DELL", "COIN", "LRCX", "ASML", "DAL"];
  console.log("=== Current AI Score Check ===");
  for (const ticker of tickers) {
    try {
      const summary = await getStockSummary(ticker);
      console.log(`${ticker}: AI Score ${summary.signal.strength}pt (${summary.signal.gradeLabel})`);
      console.log(`Reasons: ${summary.signal.reasons.slice(0, 2).join(", ")}...`);
      console.log("-----------------------------");
    } catch (err) {
      console.error(`Error for ${ticker}:`, err);
    }
  }
}

main();
