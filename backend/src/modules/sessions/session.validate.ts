import type { Request } from "express";
import { AppError } from "../../common/errors";
import type { CreateSessionInput, RegisterInput } from "./session.types";

const TIME_SLOTS = ["上午", "下午", "晚上"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_RE = /^1\d{10}$/;

function bodyOf(request: Request): Record<string, unknown> {
  return (request.body ?? {}) as Record<string, unknown>;
}

export function validateCreateSession(request: Request): CreateSessionInput {
  const body = bodyOf(request);
  const game = String(body.game ?? "").trim();
  const date = String(body.date ?? "").trim();
  const timeSlot = String(body.timeSlot ?? "").trim();
  const capacity = Number(body.capacity);

  if (!game) {
    throw new AppError(400, "请选择桌游");
  }
  if (game.length > 40) {
    throw new AppError(400, "桌游名称最多 40 个字符");
  }
  if (!DATE_RE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00`))) {
    throw new AppError(400, "请选择有效的日期");
  }
  if (!TIME_SLOTS.includes(timeSlot)) {
    throw new AppError(400, "请选择上午 / 下午 / 晚上时段");
  }
  if (!Number.isInteger(capacity) || capacity < 2 || capacity > 99) {
    throw new AppError(400, "人数上限需为 2 到 99 之间的整数");
  }

  return { game, date, timeSlot, capacity };
}

export function validateRegister(request: Request): RegisterInput {
  const body = bodyOf(request);
  const phone = String(body.phone ?? "").replace(/[\s-]/g, "");
  const nickname = String(body.nickname ?? "").trim();

  if (!PHONE_RE.test(phone)) {
    throw new AppError(400, "请输入有效的 11 位手机号");
  }
  if (nickname.length > 20) {
    throw new AppError(400, "昵称最多 20 个字符");
  }

  return { phone, nickname: nickname || undefined };
}

export function validateCapacity(request: Request): number {
  const capacity = Number(bodyOf(request).capacity);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 99) {
    throw new AppError(400, "人数上限需为 1 到 99 之间的整数");
  }
  return capacity;
}
