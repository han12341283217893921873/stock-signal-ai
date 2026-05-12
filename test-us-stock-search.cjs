// Simple test script for US stock search
const { searchTicker } = require("./server/finnhub");

async function testUSStockSearch() {
  console.log("Testing US stock search functionality...");

  try {
    // Test with a US stock symbol
    console.log("\nSearching for 'AAPL'...");
    const appleResults = await searchTicker("AAPL");
    console.log(`Results count: ${appleResults.length}`);

    // Test with another US stock symbol
    console.log("\nSearching for 'TSLA'...");
    const teslaResults = await searchTicker("TSLA");
    console.log(`Results count: ${teslaResults.length}`);
  } catch (error) {
    console.error("Error during search:", error);
  }
}

testUSStockSearch().catch(console.error);
