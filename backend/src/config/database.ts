import mongoose from "mongoose";
import { env } from "../config/env";
import { logger } from "../common/logger";
import { seedSessions } from "../modules/sessions/session.seed";

let connected = false;

function buildUri(): string {
  if (env.databaseUrl) {
    return env.databaseUrl;
  }
  const credentials = env.dbUser
    ? `${encodeURIComponent(env.dbUser)}:${encodeURIComponent(env.dbPassword)}@`
    : "";
  return `mongodb://${credentials}${env.dbHost}:${env.dbPort}/${env.dbName}?authSource=admin`;
}

export async function connectDatabase(): Promise<void> {
  const uri = buildUri();
  const maxAttempts = 30;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 3000,
      });
      connected = true;
      logger.info(
        `MongoDB 已连接：${env.dbHost}:${env.dbPort}/${env.dbName}`
      );
      await seedSessions();
      return;
    } catch (error) {
      logger.warn(
        `MongoDB 连接失败（第 ${attempt}/${maxAttempts} 次）：${
          error instanceof Error ? error.message : String(error)
        }`
      );
      if (attempt === maxAttempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

export function isDatabaseReady(): boolean {
  return connected && mongoose.connection.readyState === 1;
}
