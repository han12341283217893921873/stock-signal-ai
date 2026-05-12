import { getHistoricalData } from "./server/finnhub.js";
async function run() {
  const data = await getHistoricalData("AAPL", "1y");
  console.log("Data length:", data.length);
  if (data.length > 0) {
    console.log("First:", data[0]);
    console.log("Last:", data[data.length - 1]);
  }
}
run();
