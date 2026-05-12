import { createClient } from "@libsql/client";

async function migrate() {
  const client = createClient({
    url: "file:local.db",
  });

  try {
    console.log("Adding entrySignalScore column to portfolio_positions...");
    await client.execute(
      "ALTER TABLE portfolio_positions ADD COLUMN entrySignalScore INTEGER;"
    );
    console.log("Migration successful!");
  } catch (err) {
    if (err.message.includes("duplicate column name")) {
      console.log("Column already exists. Skipping.");
    } else {
      console.error("Migration failed:", err.message);
    }
  } finally {
    client.close();
  }
}

migrate();
