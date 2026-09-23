import type { Request, Response } from "express";
import { AppError } from "../../common/errors";
import { SessionService } from "./session.service";
import {
  validateCapacity,
  validateCreateSession,
  validateRegister,
} from "./session.validate";

const service = new SessionService();

function sessionIdOf(request: Request): string {
  return String(request.params.id);
}

export function listSessions(_request: Request, response: Response) {
  response.json({ items: service.list() });
}

export function createSession(request: Request, response: Response) {
  const payload = validateCreateSession(request);
  response.status(201).json(service.create(payload));
}

export function registerForSession(request: Request, response: Response) {
  const payload = validateRegister(request);
  response.status(201).json(service.register(sessionIdOf(request), payload));
}

export function cancelRegistration(request: Request, response: Response) {
  const phone = String(request.body?.phone ?? "").replace(/[\s-]/g, "");
  if (!/^1\d{10}$/.test(phone)) {
    throw new AppError(400, "请输入有效的 11 位手机号");
  }
  response.json(service.cancel(sessionIdOf(request), phone));
}

export function updateCapacity(request: Request, response: Response) {
  const capacity = validateCapacity(request);
  response.json(service.updateCapacity(sessionIdOf(request), capacity));
}

export function closeSession(request: Request, response: Response) {
  response.json(service.close(sessionIdOf(request)));
}

export function reopenSession(request: Request, response: Response) {
  response.json(service.reopen(sessionIdOf(request)));
}
