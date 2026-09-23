import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import { AppError } from "./common/errors";
import { logger } from "./common/logger";
import { overviewRouter } from "./modules/overview/overview.routes";
import { sessionRouter } from "./modules/sessions/session.routes";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_request, response) => response.json({ status: "ok" }));
app.get("/api/health", (_request, response) => response.json({ status: "ok" }));

app.use("/", overviewRouter);
app.use("/api", overviewRouter);
app.use("/", sessionRouter);
app.use("/api", sessionRouter);

// 未匹配的路由统一返回 JSON 404，便于前端处理
app.use((_request, response) => {
  response.status(404).json({ message: "接口不存在" });
});

// 集中处理业务错误：AppError 携带状态码，其余异常统一按 500 返回
app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({ message: error.message });
    return;
  }
  logger.error(error instanceof Error ? error.stack ?? error.message : String(error));
  response.status(500).json({ message: "服务内部错误，请稍后再试" });
});
