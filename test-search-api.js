// Simple test script to verify the search API functionality
// Using built-in fetch API

async function testSearchAPI() {
  console.log("Testing Stock Search API...");

  // Test US stock ticker search
  const usStockSymbols = ["AAPL", "TSLA", "MSFT", "GOOGL"];

  for (const symbol of usStockSymbols) {
    try {
      console.log(`\nTesting search for "${symbol}"...`);
      const response = await fetch(
        `http://localhost:3000/api/trpc/stock.search?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22query%22%3A%22${symbol}%22%7D%7D%7D`
      );

      if (!response.ok) {
        console.error(`Error: ${response.status} ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      console.log(`Response status: ${response.status}`);

      if (data.result?.data[0]?.result?.data) {
        const results = data.result.data[0].result.data;
        console.log(`Found ${results.length} results for "${symbol}"`);

        if (results.length > 0) {
          console.log("First 3 results:");
          results.slice(0, 3).forEach((item, i) => {
            console.log(
              `  ${i + 1}. ${item.ticker} - ${item.name} (${item.exchange})`
            );
          });
        } else {
          console.log("No results found");
        }
      } else {
        console.log("Unexpected response format:", data);
      }
    } catch (error) {
      console.error(`Error testing search for "${symbol}":`, error.message);
    }
  }
}

testSearchAPI().catch(console.error);
