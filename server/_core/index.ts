import "dotenv/config";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
process.env.NODE_ENV = process.env.NODE_ENV || "development";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { startAlertScheduler } from "../alertScheduler";
import { startSignalPerformanceScheduler } from "../signalPerformanceScheduler";
import { setupWebSocketServer } from "../ws";
import { registerOAuthRoutes } from "./oauth";
import { registerGoogleOAuthRoutes } from "./googleOAuth";

const app = express();

// --- 미들웨어 및 라우트 등록 (Vercel 호환을 위해 즉시 실행) ---
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

registerStorageProxy(app);
registerGoogleOAuthRoutes(app);
registerOAuthRoutes(app);

// tRPC API
app.use(
  ["/api/trpc", "/trpc"],
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// 헬스체크 엔드포인트
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), env: process.env.NODE_ENV });
});

// --- 서버 시작 로직 (로컬 환경 전용) ---
async function findAvailablePort(startPort: number = 3000): Promise<number> {
  const isPortAvailable = (port: number) => new Promise(resolve => {
    const s = net.createServer().listen(port, () => s.close(() => resolve(true))).on("error", () => resolve(false));
  });
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  return startPort;
}

if (!process.env.VERCEL) {
  const server = createServer(app);
  setupWebSocketServer(server);

  const start = async () => {
    const preferredPort = parseInt(process.env.PORT || "3000");
    const port = await findAvailablePort(preferredPort);

    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server, port);
    } else {
      serveStatic(app);
    }

    server.listen(port, () => {
      console.log(`🚀 Server started on http://localhost:${port}/`);
      startAlertScheduler();
      startSignalPerformanceScheduler();
    });
  };
  start().catch(console.error);
}

export default app;
