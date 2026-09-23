import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../common/errors";
import { SessionService } from "./session.service";

const service = new SessionService();

type AsyncHandler = (
  request: Request,
  response: Response,
  next: NextFunction
) => Promise<unknown>;

/** 把服务层抛出的 AppError 转成对应 HTTP 状态码 */
function asyncHandler(handler: AsyncHandler) {
  return (request: Request, response: Response, next: NextFunction) => {
    handler(request, response, next).catch((error: unknown) => {
      if (error instanceof AppError) {
        response.status(error.statusCode).json({ message: error.message });
        return;
      }
      next(error);
    });
  };
}

export const getCatalog = asyncHandler(async (_request, response) => {
  response.json(service.getCatalog());
});

export const listSessions = asyncHandler(async (_request, response) => {
  response.json(await service.listSessions());
});

export const getSession = asyncHandler(async (request, response) => {
  response.json(await service.getSession(String(request.params.id)));
});

export const createSession = asyncHandler(async (request, response) => {
  const created = await service.createSession(request.body ?? {});
  response.status(201).json(created);
});

export const registerSession = asyncHandler(async (request, response) => {
  response.json(
    await service.register(String(request.params.id), request.body?.phone)
  );
});

export const cancelRegistration = asyncHandler(async (request, response) => {
  response.json(
    await service.cancel(String(request.params.id), request.body?.phone)
  );
});

export const updateSessionCapacity = asyncHandler(async (request, response) => {
  response.json(
    await service.updateMaxPlayers(
      String(request.params.id),
      request.body?.maxPlayers
    )
  );
});

export const closeSession = asyncHandler(async (request, response) => {
  response.json(await service.closeRecruitment(String(request.params.id)));
});

export const reopenSession = asyncHandler(async (request, response) => {
  response.json(await service.reopenRecruitment(String(request.params.id)));
});
