import { getHistoricalData } from "../server/finnhub";

async function test() {
  console.log("Testing getHistoricalData for AAPL...");
  try {
    const data = await getHistoricalData("AAPL", "6mo");
    console.log("Success! Data length:", data.length);
    if (data.length > 0) {
      console.log("Last candle:", data[data.length - 1]);
    } else {
      console.log("Returned empty array.");
    }
  } catch (err) {
    console.error("Failed:", err);
  }
  process.exit(0);
}

test();
