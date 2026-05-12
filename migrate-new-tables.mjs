import { createConnection } from "mysql2/promise";
import { config } from "dotenv";
config();

const sql = `
CREATE TABLE IF NOT EXISTS \`portfolio_positions\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`userId\` int NOT NULL,
  \`ticker\` varchar(20) NOT NULL,
  \`name\` varchar(200),
  \`quantity\` decimal(16,6) NOT NULL,
  \`avgPrice\` decimal(16,4) NOT NULL,
  \`memo\` text,
  \`addedAt\` timestamp NOT NULL DEFAULT (now()),
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`portfolio_positions_id\` PRIMARY KEY(\`id\`)
);

CREATE TABLE IF NOT EXISTS \`alert_conditions\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`userId\` int NOT NULL,
  \`ticker\` varchar(20) NOT NULL,
  \`name\` varchar(200),
  \`conditionType\` enum('rsi_below','rsi_above','signal_strength_above','price_above','price_below') NOT NULL,
  \`threshold\` decimal(16,4) NOT NULL,
  \`isActive\` int NOT NULL DEFAULT 1,
  \`lastTriggeredAt\` timestamp,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT \`alert_conditions_id\` PRIMARY KEY(\`id\`)
);

CREATE TABLE IF NOT EXISTS \`scan_history\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`market\` enum('us','kr') NOT NULL,
  \`scannedAt\` timestamp NOT NULL DEFAULT (now()),
  \`totalScanned\` int NOT NULL DEFAULT 0,
  \`topBuys\` text,
  \`topSells\` text,
  CONSTRAINT \`scan_history_id\` PRIMARY KEY(\`id\`)
);

CREATE TABLE IF NOT EXISTS \`stock_notes\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`userId\` int NOT NULL,
  \`ticker\` varchar(20) NOT NULL,
  \`content\` text NOT NULL,
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`stock_notes_id\` PRIMARY KEY(\`id\`)
);
`;

async function migrate() {
  const conn = await createConnection(process.env.DATABASE_URL);
  const statements = sql
    .split(";")
    .map(s => s.trim())
    .filter(s => s.length > 0);
  for (const stmt of statements) {
    try {
      await conn.execute(stmt);
      console.log("✓ Executed:", stmt.slice(0, 60) + "...");
    } catch (err) {
      console.error("✗ Failed:", err.message);
    }
  }
  await conn.end();
  console.log("Migration complete.");
}

migrate().catch(console.error);
