import { getStockSummary } from "../server/finnhub";

async function test() {
  console.log("Testing getStockSummary for AAPL...");
  try {
    const summary = await getStockSummary("AAPL");
    console.log("Success!");
    console.log("Name:", summary.name);
    console.log("Price:", summary.price);
    console.log("Signal Grade:", summary.signal.grade);
    console.log("Signal Score:", summary.signal.strength);
    console.log("Reasons:", summary.signal.reasons);
  } catch (err) {
    console.error("Failed:", err);
  }
  process.exit(0);
}

test();
