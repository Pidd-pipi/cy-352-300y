import { randomUUID } from "node:crypto";
import { AppError } from "../../common/errors";
import type {
  CreateSessionInput,
  GameSession,
  RegisterInput,
  Registration,
  SessionView,
} from "./session.types";

/**
 * 组局数据存储。
 *
 * 当前环境没有接入 MongoDB，先用进程内内存实现；接口语义保持稳定，
 * 后续替换成 Mongoose Model 时不需要改动 controller / service。
 *
 * 候补转正的关键规则集中在本文件，便于审查：
 * - 同一手机号在同一场只占一个位置（confirmed 与 waitlist 共同去重）
 * - 满员后的新报名进入候补队列，按报名时间 FIFO
 * - 有人退出确认席位时，候补队首自动转正
 */
class SessionStore {
  private readonly sessions = new Map<string, GameSession>();

  create(input: CreateSessionInput): GameSession {
    const session: GameSession = {
      id: randomUUID(),
      game: input.game,
      date: input.date,
      timeSlot: input.timeSlot,
      capacity: input.capacity,
      status: "open",
      registrations: [],
      createdAt: new Date().toISOString(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  list(): GameSession[] {
    return [...this.sessions.values()].sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt),
    );
  }

  getOrThrow(id: string): GameSession {
    const session = this.sessions.get(id);
    if (!session) {
      throw new AppError(404, "组局不存在或已被删除");
    }
    return session;
  }

  register(sessionId: string, input: RegisterInput): { session: GameSession; registration: Registration } {
    const session = this.getOrThrow(sessionId);

    if (session.status === "closed") {
      // 关闭招募：拒绝新报名，现有名单与候补顺序不动
      throw new AppError(409, "本场已关闭招募，不再接受新报名");
    }

    const phone = normalizePhone(input.phone);
    if (session.registrations.some((item) => item.phone === phone)) {
      throw new AppError(409, "该手机号已报名本场，同一手机号只能占一个位置");
    }

    const confirmedCount = countByStatus(session, "confirmed");
    const registration: Registration = {
      id: randomUUID(),
      phone,
      nickname: input.nickname?.trim() || maskPhone(phone),
      status: confirmedCount >= session.capacity ? "waitlist" : "confirmed",
      joinedAt: new Date().toISOString(),
    };
    session.registrations.push(registration);

    return { session, registration };
  }

  cancel(sessionId: string, phone: string): GameSession {
    const session = this.getOrThrow(sessionId);
    const normalized = normalizePhone(phone);
    const index = session.registrations.findIndex(
      (item) => item.phone === normalized,
    );
    if (index === -1) {
      throw new AppError(404, "没有找到该手机号的报名记录");
    }

    const [removed] = session.registrations.splice(index, 1);
    if (removed.status === "confirmed") {
      // 确认席位空出：候补队首（最早报名的一位）自动转正
      const next = session.registrations.find((item) => item.status === "waitlist");
      if (next) {
        next.status = "confirmed";
      }
    }
    return session;
  }

  setCapacity(sessionId: string, capacity: number): GameSession {
    const session = this.getOrThrow(sessionId);
    const confirmedCount = countByStatus(session, "confirmed");

    if (capacity < confirmedCount) {
      throw new AppError(
        409,
        `人数上限不能低于已确认人数（当前已确认 ${confirmedCount} 人）`,
      );
    }

    session.capacity = capacity;
    this.promoteWaitlist(session);
    return session;
  }

  setStatus(sessionId: string, status: GameSession["status"]): GameSession {
    const session = this.getOrThrow(sessionId);
    session.status = status;
    // 重新开放时若有空缺席位，优先让候补队首转正
    if (status === "open") {
      this.promoteWaitlist(session);
    }
    return session;
  }

  /**
   * 容量调大 / 重新开放后，按候补顺序补满空缺席位。
   */
  private promoteWaitlist(session: GameSession) {
    for (const item of session.registrations) {
      const confirmedCount = countByStatus(session, "confirmed");
      if (confirmedCount >= session.capacity) {
        break;
      }
      if (item.status === "waitlist") {
        item.status = "confirmed";
      }
    }
  }
}

function countByStatus(session: GameSession, status: Registration["status"]): number {
  return session.registrations.reduce(
    (total, item) => (item.status === status ? total + 1 : total),
    0,
  );
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/[\s-]/g, "");
  if (!/^1\d{10}$/.test(digits)) {
    throw new AppError(400, "请输入有效的 11 位中国大陆手机号");
  }
  return digits;
}

function maskPhone(phone: string): string {
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
}

export function toSessionView(session: GameSession): SessionView {
  const confirmedCount = countByStatus(session, "confirmed");
  const waitlistCount = countByStatus(session, "waitlist");
  return {
    id: session.id,
    game: session.game,
    date: session.date,
    timeSlot: session.timeSlot,
    capacity: session.capacity,
    status: session.status,
    confirmedCount,
    waitlistCount,
    seatsLeft: Math.max(0, session.capacity - confirmedCount),
    full: confirmedCount >= session.capacity,
    // registrations 按报名时间排列，候补顺序即数组中的先后顺序
    registrations: [...session.registrations].sort(
      (a, b) => a.joinedAt.localeCompare(b.joinedAt),
    ),
    createdAt: session.createdAt,
  };
}

export const sessionStore = new SessionStore();
