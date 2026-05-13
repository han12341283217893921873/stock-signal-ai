import "dotenv/config";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
process.env.NODE_ENV = process.env.NODE_ENV || "development";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy.js";
import { appRouter } from "../routers.js";
import { createContext } from "./context.js";
import { serveStatic, setupVite } from "./vite.js";
import { startAlertScheduler } from "../alertScheduler.js";
import { startSignalPerformanceScheduler } from "../signalPerformanceScheduler.js";
// import { setupWebSocketServer } from "../ws.js";
import { registerOAuthRoutes } from "./oauth.js";
import { registerGoogleOAuthRoutes } from "./googleOAuth.js";
import cors from "cors";

const app = express();

async function startServer() {
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cors());

  registerStorageProxy(app);
  registerGoogleOAuthRoutes(app);
  registerOAuthRoutes(app);

  app.use(
    ["/api/trpc", "/trpc"],
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  }

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      mode: "core-v2"
    });
  });

  if (!process.env.VERCEL) {
    const server = createServer(app);
    // setupWebSocketServer(server);

    if (process.env.NODE_ENV !== "production") {
      await setupVite(app, server);
    }

    const PORT = Number(process.env.PORT) || 3000;
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
      startAlertScheduler();
      startSignalPerformanceScheduler();
    });
  }
}

startServer().catch(console.error);

export default app;
