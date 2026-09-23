import { Router } from "express";
import {
  cancelRegistration,
  closeSession,
  createSession,
  getCatalog,
  getSession,
  listSessions,
  registerSession,
  reopenSession,
  updateSessionCapacity,
} from "./session.controller";

export const sessionRouter = Router();

sessionRouter.get("/catalog", getCatalog);
sessionRouter.get("/sessions", listSessions);
sessionRouter.get("/sessions/:id", getSession);
sessionRouter.post("/sessions", createSession);
sessionRouter.post("/sessions/:id/registrations", registerSession);
sessionRouter.post("/sessions/:id/cancel", cancelRegistration);
sessionRouter.patch("/sessions/:id/capacity", updateSessionCapacity);
sessionRouter.post("/sessions/:id/close", closeSession);
sessionRouter.post("/sessions/:id/reopen", reopenSession);
