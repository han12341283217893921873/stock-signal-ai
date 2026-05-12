import { createClient } from "@libsql/client";

async function main() {
  const client = createClient({
    url: "file:local.db",
  });

  try {
    console.log("Creating indexes for alert_conditions...");
    await client.execute(
      "CREATE INDEX IF NOT EXISTS alert_conditions_userId_idx ON alert_conditions (userId);"
    );
    await client.execute(
      "CREATE INDEX IF NOT EXISTS alert_conditions_ticker_idx ON alert_conditions (ticker);"
    );
    console.log("Done.");
  } catch (err) {
    console.error(err);
  } finally {
    client.close();
  }
}

main();
