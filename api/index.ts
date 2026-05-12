import express from "express";
import cors from "cors";
import * as trpcExpress from "@trpc/server/adapters/express";
import { registerStorageProxy } from "../server/_core/storageProxy";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { registerGoogleOAuthRoutes } from "../server/_core/googleOAuth";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import path from "path";

const app = express();

app.use(cors());
app.use(express.json());

registerGoogleOAuthRoutes(app);
registerOAuthRoutes(app);
registerStorageProxy(app);

app.use(
      ["/api/trpc", "/trpc"],
      trpcExpress.createExpressMiddleware({
              router: appRouter,
              createContext,
      })
    );

app.get("/api/health", (req, res) => {
      res.json({
              status: "ok",
              mode: "full-v3"
      });
});

if (process.env.NODE_ENV === "production") {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
              res.sendFile(path.join(distPath, "index.html"));
      });
}

export default app;
