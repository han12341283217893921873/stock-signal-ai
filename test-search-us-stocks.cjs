#!/usr/bin/env node
/**
 * Test script to debug US stock search functionality
 * This script tests the searchTicker function with US stock symbols
 */

require("dotenv").config();
const { searchTicker } = require("./server/finnhub");

async function testSearchUSStocks() {
  console.log("=== Testing US Stock Search Functionality ===");

  // Test cases for US stocks
  const testQueries = ["AAPL", "TSLA", "MSFT", "AMZN", "GOOGL"];

  for (const query of testQueries) {
    console.log(`\n[TEST] Searching for "${query}"...`);
    try {
      // Add detailed logging to see the raw API response
      console.log(`[DEBUG] Calling searchTicker with query: "${query}"`);
      const results = await searchTicker(query);

      console.log(`[DEBUG] Search results count: ${results.length}`);
      if (results.length > 0) {
        console.log("✅ SUCCESS: Found results");
        console.log("Results:");
        results.forEach((item, index) => {
          console.log(
            `  ${index + 1}. ${item.ticker} - ${item.name} (${item.exchange})`
          );
        });
      } else {
        console.log("❌ ERROR: No results found");
      }
    } catch (err) {
      console.error(`❌ ERROR: Search failed for "${query}":`, err);
    }
  }
}

// Run the test
testSearchUSStocks().catch(err => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
