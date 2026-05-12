// Direct test of Finnhub API with API key
import axios from "axios";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_API_BASE = "https://finnhub.io/api/v1";

if (!FINNHUB_API_KEY) {
  console.error("❌ FINNHUB_API_KEY environment variable is not set!");
  process.exit(1);
}

console.log(
  `🔑 API Key: ${FINNHUB_API_KEY.substring(0, 8)}...${FINNHUB_API_KEY.slice(-4)}`
);

async function testFinnhubSearch() {
  console.log("\n🔍 Testing Finnhub Search API directly");

  // Test US stock ticker search
  const usStockSymbols = ["AAPL", "TSLA"];

  for (const symbol of usStockSymbols) {
    try {
      console.log(`\nTesting search for "${symbol}"...`);
      const response = await axios.get(`${FINNHUB_API_BASE}/search`, {
        params: {
          q: symbol,
          token: FINNHUB_API_KEY,
        },
      });

      console.log(`✅ Success! Status: ${response.status}`);

      if (response.data.result && response.data.result.length > 0) {
        console.log(`Found ${response.data.result.length} results`);

        // Filter results to include only "Common Stock" type
        const stockResults = response.data.result.filter(
          item =>
            item.type === "Common Stock" ||
            item.type === "equity" ||
            item.type === "etf"
        );

        console.log(
          `After filtering for stock types: ${stockResults.length} results`
        );

        if (stockResults.length > 0) {
          console.log("First 3 results:");
          stockResults.slice(0, 3).forEach((item, i) => {
            console.log(
              `  ${i + 1}. ${item.symbol} - ${item.description} (${item.type})`
            );
          });
        } else {
          console.log("No stock results found after filtering");
        }
      } else {
        console.log("No results found");
      }
    } catch (error) {
      console.error(`❌ Error searching for "${symbol}":`, error.message);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
      }
    }
  }
}

testFinnhubSearch().catch(console.error);
