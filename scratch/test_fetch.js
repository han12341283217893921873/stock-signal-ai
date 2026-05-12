import { getHistoricalData } from "./server/finnhub.js";
import { ENV } from "./server/_core/env.js";

async function test() {
  console.log("Testing getHistoricalData for AAPL...");
  try {
    const data = await getHistoricalData("AAPL", "6mo");
    console.log("Success! Data length:", data.length);
    if (data.length > 0) {
      console.log("Last candle:", data[data.length - 1]);
    }
  } catch (err) {
    console.error("Failed:", err);
  }
}

test();
