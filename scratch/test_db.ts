import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN!,
});

async function test() {
  try {
    const rs = await client.execute("SELECT 1");
    console.log("Success:", rs.rows);
  } catch (e) {
    console.error("Failed:", e);
  }
}

test();
