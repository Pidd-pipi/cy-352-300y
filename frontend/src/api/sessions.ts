import { API_BASE_URL } from "../constants/app";
import type {
  CreateSessionPayload,
  RegisterPayload,
  SessionView,
} from "../types";

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...init,
  });

  let payload: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message: unknown }).message)
        : `请求失败（${response.status}）`;
    throw new ApiError(response.status, message);
  }

  return payload as T;
}

export function fetchSessions(): Promise<{ items: SessionView[] }> {
  return request<{ items: SessionView[] }>("/sessions");
}

export function createSession(payload: CreateSessionPayload): Promise<SessionView> {
  return request<SessionView>("/sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function registerForSession(
  sessionId: string,
  payload: RegisterPayload,
): Promise<SessionView> {
  return request<SessionView>(`/sessions/${sessionId}/registrations`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function cancelRegistration(
  sessionId: string,
  phone: string,
): Promise<SessionView> {
  return request<SessionView>(`/sessions/${sessionId}/registrations`, {
    method: "DELETE",
    body: JSON.stringify({ phone }),
  });
}

export function updateSessionCapacity(
  sessionId: string,
  capacity: number,
): Promise<SessionView> {
  return request<SessionView>(`/sessions/${sessionId}/capacity`, {
    method: "PATCH",
    body: JSON.stringify({ capacity }),
  });
}

export function closeSession(sessionId: string): Promise<SessionView> {
  return request<SessionView>(`/sessions/${sessionId}/close`, { method: "POST" });
}

export function reopenSession(sessionId: string): Promise<SessionView> {
  return request<SessionView>(`/sessions/${sessionId}/reopen`, { method: "POST" });
}
