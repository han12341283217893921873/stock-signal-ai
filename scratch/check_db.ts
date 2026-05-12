import { createClient } from "@libsql/client";

async function main() {
  const client = createClient({
    url: "file:local.db",
  });

  try {
    const tables = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table';"
    );
    console.log(
      "Tables:",
      tables.rows.map(r => r.name)
    );

    const columns = await client.execute(
      "PRAGMA table_info(alert_conditions);"
    );
    console.log(
      "alert_conditions columns:",
      columns.rows.map(r => r.name)
    );

    const snapshots = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='portfolio_snapshots';"
    );
    console.log("portfolio_snapshots exists:", snapshots.rows.length > 0);
  } catch (err) {
    console.error(err);
  } finally {
    client.close();
  }
}

main();
