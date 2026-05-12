import { createClient } from "@libsql/client";

async function main() {
  const client = createClient({
    url: "file:local.db",
  });

  try {
    const indexes = await client.execute(
      "SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='alert_conditions';"
    );
    console.log("Existing indexes on alert_conditions:", indexes.rows);

    const newIndexes = await client.execute(
      "SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='__new_alert_conditions';"
    );
    console.log("Existing indexes on __new_alert_conditions:", newIndexes.rows);

    // Perform rename
    console.log("Repairing alert_conditions table...");
    await client.execute("DROP TABLE alert_conditions;");
    await client.execute(
      "ALTER TABLE __new_alert_conditions RENAME TO alert_conditions;"
    );
    console.log("Done.");
  } catch (err) {
    console.error(err);
  } finally {
    client.close();
  }
}

main();
