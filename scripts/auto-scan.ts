import { runScanner } from "../server/scanner";
import * as dotenv from "dotenv";

// .env.local 로드 (로컬 테스트용)
dotenv.config({ path: ".env.local" });

async function main() {
  console.log("🚀 Starting Automatic Global Scan...");
  console.log(`Time: ${new Date().toLocaleString()}`);

  try {
    // 1. 미국 시장 스캔
    console.log("--- Scanning US Market ---");
    await runScanner("us");
    console.log("✅ US Market Scan Complete.");
    
    // 2. 한국 시장 스캔
    console.log("--- Scanning KR Market ---");
    await runScanner("kr");
    console.log("✅ KR Market Scan Complete.");

    console.log("🎉 All scan jobs finished successfully.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Scan failed:", error);
    process.exit(1);
  }
}

main();
