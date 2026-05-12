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

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  console.log("Starting server initialization...");
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  console.log("Registering storage proxy...");
  registerStorageProxy(app);

  console.log("Setting up WebSocket server...");
  // Set up WebSocket server
  setupWebSocketServer(server);

  console.log("Registering OAuth routes...");
  // Google OAuth 2.0 라우트 (Google 계정 로그인)
  registerGoogleOAuthRoutes(app);
  // 기존 Manus OAuth 라우트 (호환성 유지)
  registerOAuthRoutes(app);

  const preferredPort = parseInt(process.env.PORT || "3000");
  console.log(`Finding available port starting from ${preferredPort}...`);
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // 헬스체크 엔드포인트 추가
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    console.log("Setting up Vite (this may take a few seconds)...");
    try {
      await setupVite(app, server, port);
      console.log("Vite setup complete.");
    } catch (err) {
      console.error("Failed to setup Vite:", err);
    }
  } else {
    console.log("Serving static files...");
    serveStatic(app);
  }

  console.log(`Attempting to listen on port ${port}...`);
  server.listen(port, async () => {
    console.log(`===================================================`);
    console.log(`🚀 Server started on http://localhost:${port}/`);
    console.log(`===================================================`);

    // 알림 조건 자동 평가 스케줄러 시작
    startAlertScheduler();
    // 신호 성과 자동 평가 스케줄러 시작
    startSignalPerformanceScheduler();
    
    console.log("App is now fully ready.");
  });
}

startServer().catch(console.error);
