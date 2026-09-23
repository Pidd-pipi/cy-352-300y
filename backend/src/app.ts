import cors from "cors";
import express from "express";
import helmet from "helmet";
import type { NextFunction, Request, Response } from "express";
import { isDatabaseReady } from "./config/database";
import { logger } from "./common/logger";
import { overviewRouter } from "./modules/overview/overview.routes";
import { sessionRouter } from "./modules/sessions/session.routes";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ status: "ok", db: isDatabaseReady() ? "up" : "down" });
});
app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", db: isDatabaseReady() ? "up" : "down" });
});

app.use("/", overviewRouter);
app.use("/api", overviewRouter);
app.use("/", sessionRouter);
app.use("/api", sessionRouter);

// 兜底错误处理：未被控制器捕获的异常统一返回 500
app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  logger.error(error instanceof Error ? error.stack ?? error.message : String(error));
  if (response.headersSent) {
    return;
  }
  response.status(500).json({ message: "服务内部错误，请稍后重试" });
});
