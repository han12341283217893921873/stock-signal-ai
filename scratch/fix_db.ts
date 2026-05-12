import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function fix() {
  const client = createClient({ url: process.env.DATABASE_URL! });
  try {
    await client.execute("ALTER TABLE users ADD COLUMN notifyEmail TEXT");
    console.log("Added notifyEmail");
  } catch (e) {
    console.log("notifyEmail already exists or failed");
  }

  try {
    await client.execute("ALTER TABLE users ADD COLUMN notifyWebhook TEXT");
    console.log("Added notifyWebhook");
  } catch (e) {
    console.log("notifyWebhook already exists or failed");
  }
}

fix().catch(console.error);
