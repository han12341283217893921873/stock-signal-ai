import express from "express";
const app = express();
app.get("/api/health", (req, res) => res.json({ status: "ok", minimal: true }));
export default app;
