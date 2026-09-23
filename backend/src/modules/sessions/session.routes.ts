import { Router } from "express";
import {
  cancelRegistration,
  closeSession,
  createSession,
  listSessions,
  registerForSession,
  reopenSession,
  updateCapacity,
} from "./session.controller";

export const sessionRouter = Router();

sessionRouter.get("/sessions", listSessions);
sessionRouter.post("/sessions", createSession);
sessionRouter.post("/sessions/:id/registrations", registerForSession);
sessionRouter.delete("/sessions/:id/registrations", cancelRegistration);
sessionRouter.patch("/sessions/:id/capacity", updateCapacity);
sessionRouter.post("/sessions/:id/close", closeSession);
sessionRouter.post("/sessions/:id/reopen", reopenSession);
