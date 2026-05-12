import { getDb } from "./server/db";
import { sql } from "drizzle-orm";
import { resolve } from "path";
import dotenv from "dotenv";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("DB not connected");
    return;
  }

  try {
    await db.run(
      sql`ALTER TABLE users ADD COLUMN cashBalance REAL NOT NULL DEFAULT 100000;`
    );
    console.log("Added cashBalance column");
  } catch (e: any) {
    console.log("cashBalance error (might exist):", e.message);
  }

  try {
    await db.run(
      sql`ALTER TABLE users ADD COLUMN realizedPnl REAL NOT NULL DEFAULT 0;`
    );
    console.log("Added realizedPnl column");
  } catch (e: any) {
    console.log("realizedPnl error (might exist):", e.message);
  }
}

main().catch(console.error);

main().catch(console.error);
