import { createClient } from "@libsql/client";

async function main() {
  const client = createClient({
    url: "file:local.db",
  });

  try {
    const columns = await client.execute(
      "PRAGMA table_info(__new_alert_conditions);"
    );
    console.log(
      "__new_alert_conditions columns:",
      columns.rows.map(r => r.name)
    );
  } catch (err) {
    console.error(err);
  } finally {
    client.close();
  }
}

main();
