import { API_BASE_URL } from "../constants/app";
import type { OverviewResponse } from "../types";
import type {
  CreateSessionPayload,
  SessionCatalog,
  SessionView,
} from "../types/session";

/** 提取后端返回的错误信息，统一在页面上弹提示 */
async function parseError(response: Response): Promise<Error> {
  let message = `请求失败（${response.status}）`;
  try {
    const body = (await response.json()) as { message?: string };
    if (body.message) {
      message = body.message;
    }
  } catch {
    // 非 JSON 错误响应时使用默认提示
  }
  return new Error(message);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    throw await parseError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export async function fetchOverview(): Promise<OverviewResponse> {
  const response = await fetch(`${API_BASE_URL}/overview`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Overview request failed: ${response.status}`);
  }

  return response.json() as Promise<OverviewResponse>;
}

export function fetchCatalog(): Promise<SessionCatalog> {
  return request<SessionCatalog>("/catalog");
}

export function fetchSessions(): Promise<SessionView[]> {
  return request<SessionView[]>("/sessions");
}

export function createSession(
  payload: CreateSessionPayload
): Promise<SessionView> {
  return request<SessionView>("/sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function registerSession(
  sessionId: string,
  phone: string
): Promise<SessionView> {
  return request<SessionView>(`/sessions/${sessionId}/registrations`, {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export function cancelRegistration(
  sessionId: string,
  phone: string
): Promise<SessionView> {
  return request<SessionView>(`/sessions/${sessionId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export function updateSessionCapacity(
  sessionId: string,
  maxPlayers: number
): Promise<SessionView> {
  return request<SessionView>(`/sessions/${sessionId}/capacity`, {
    method: "PATCH",
    body: JSON.stringify({ maxPlayers }),
  });
}

export function closeSession(sessionId: string): Promise<SessionView> {
  return request<SessionView>(`/sessions/${sessionId}/close`, {
    method: "POST",
  });
}

export function reopenSession(sessionId: string): Promise<SessionView> {
  return request<SessionView>(`/sessions/${sessionId}/reopen`, {
    method: "POST",
  });
}
