import { getDb } from "./server/db";
import { chartPatternCache, newsSummaries } from "./drizzle/schema";

async function main() {
  const db = await getDb();
  if (db) {
    await db.delete(chartPatternCache);
    await db.delete(newsSummaries);
    console.log("Cache cleared successfully");
  }
}

main().catch(console.error);
