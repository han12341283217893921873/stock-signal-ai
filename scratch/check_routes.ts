import { appRouter } from "../server/routers.ts";

console.log("Registered Routes:");
Object.keys(appRouter._def.procedures).forEach(key => {
  console.log(`- ${key}`);
});

const scanner = (appRouter._def.procedures as any).scanner;
if (scanner) {
  console.log("\nScanner Procedures:");
  Object.keys(scanner._def.procedures).forEach(key => {
    console.log(`  - ${key}`);
  });
}

const portfolio = (appRouter._def.procedures as any).portfolio;
if (portfolio) {
  console.log("\nPortfolio Procedures:");
  Object.keys(portfolio._def.procedures).forEach(key => {
    console.log(`  - ${key}`);
  });
}
