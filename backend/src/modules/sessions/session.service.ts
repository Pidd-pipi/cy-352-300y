import mongoose from "mongoose";
import { AppError } from "../../common/errors";
import { logger } from "../../common/logger";
import { GAME_CATALOG, TIME_SLOTS, findGame, findSlot } from "./session.catalog";
import { SessionModel, type SessionDocument } from "./session.model";
import type {
  CreateSessionPayload,
  RegistrationEntry,
  RegistrationStatusValue,
  SessionStatusValue,
  SessionView,
} from "./session.types";

const PHONE_PATTERN = /^1[3-9]\d{9}$/;
const MAX_PLAYERS_MIN = 2;
const MAX_PLAYERS_MAX = 30;

interface RegistrationShape {
  _id: unknown;
  phone: string;
  status: RegistrationStatusValue;
  joinedAt: Date;
}

function maskPhone(phone: string): string {
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
}

function isTodayOrFuture(dateText: string): boolean {
  const [year, month, day] = dateText.split("-").map(Number);
  const target = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return target.getTime() >= today.getTime();
}

export class SessionService {
  getCatalog() {
    return { games: GAME_CATALOG, slots: TIME_SLOTS };
  }

  async listSessions(): Promise<SessionView[]> {
    const sessions = await SessionModel.find()
      .sort({ date: 1, slot: 1, createdAt: -1 })
      .lean();
    return sessions.map((session) => this.toView(session as SessionDocument));
  }

  async getSession(id: string): Promise<SessionView> {
    return this.toView(await this.requireSession(id));
  }

  async createSession(payload: CreateSessionPayload): Promise<SessionView> {
    const game = findGame(String(payload.gameCode ?? ""));
    if (!game) {
      throw new AppError(400, "请选择有效的桌游");
    }
    const slot = findSlot(String(payload.slot ?? ""));
    if (!slot) {
      throw new AppError(400, "请选择有效的时段");
    }
    const dateText = String(payload.date ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText) || Number.isNaN(Date.parse(dateText))) {
      throw new AppError(400, "请选择有效的日期");
    }
    if (!isTodayOrFuture(dateText)) {
      throw new AppError(400, "组局日期不能早于今天");
    }
    const maxPlayers = Number(payload.maxPlayers);
    if (
      !Number.isInteger(maxPlayers) ||
      maxPlayers < MAX_PLAYERS_MIN ||
      maxPlayers > MAX_PLAYERS_MAX
    ) {
      throw new AppError(
        400,
        `人数上限需为 ${MAX_PLAYERS_MIN}-${MAX_PLAYERS_MAX} 之间的整数`
      );
    }
    const hostName = String(payload.hostName ?? "").trim();
    if (!hostName) {
      throw new AppError(400, "请填写发起人昵称");
    }
    if (hostName.length > 20) {
      throw new AppError(400, "发起人昵称最长 20 个字符");
    }
    const hostContact = String(payload.hostContact ?? "").trim();
    if (!PHONE_PATTERN.test(hostContact)) {
      throw new AppError(400, "请填写有效的发起人手机号");
    }
    const note = String(payload.note ?? "").trim();
    if (note.length > 200) {
      throw new AppError(400, "备注最长 200 个字符");
    }

    const created = (await SessionModel.create({
      gameCode: game.code,
      date: dateText,
      slot: slot.code,
      maxPlayers,
      hostName,
      hostContact,
      note,
      status: "open",
      registrations: [],
    })) as SessionDocument;

    logger.info(`组局已发布：${game.name} ${dateText} ${slot.label}，上限 ${maxPlayers} 人`);
    return this.toView(created);
  }

  /**
   * 报名拼车：
   * - 招募已关闭 -> 拒绝
   * - 同一手机号已在名单或候补 -> 拒绝（一场一位）
   * - 有名额 -> 直接入选；满员 -> 进入候补队列
   */
  async register(sessionId: string, phoneInput: unknown): Promise<SessionView> {
    const phone = this.normalizePhone(phoneInput);

    const session = await this.requireSession(sessionId);
    if (session.status === "closed") {
      throw new AppError(409, "本场组局已关闭招募，不再接受新报名");
    }
    const registrations = session.registrations as RegistrationShape[];
    const existing = registrations.find((item) => item.phone === phone);
    if (existing) {
      throw new AppError(
        409,
        existing.status === "waitlist"
          ? "该手机号已在本场候补队列中，无需重复报名"
          : "该手机号已在本场报名名单中，无需重复报名"
      );
    }
    const registeredCount = this.countStatus(registrations, "registered");
    const nextStatus: RegistrationStatusValue =
      registeredCount < session.maxPlayers ? "registered" : "waitlist";

    // 原子写入：把「入选人数 < 上限」放进更新过滤条件（$expr），
    // 并发下只可能有一人抢到最后一个名额，其余自动落入候补分支
    const capacityGuard = {
      $expr: {
        $lt: [
          {
            $size: {
              $filter: {
                input: "$registrations",
                as: "reg",
                cond: { $eq: ["$$reg.status", "registered"] },
              },
            },
          },
          "$maxPlayers",
        ],
      },
    };
    const pushRegistration = (status: RegistrationStatusValue) => ({
      $push: {
        registrations: {
          $each: [{ phone, status, joinedAt: new Date() }],
        },
      },
    });

    let result = await SessionModel.updateOne(
      {
        _id: session._id,
        status: "open",
        "registrations.phone": { $ne: phone },
        ...(nextStatus === "registered" ? capacityGuard : {}),
      },
      pushRegistration(nextStatus)
    );

    if (result.modifiedCount !== 1 && nextStatus === "registered") {
      // 名额在并发瞬间被抢光 -> 转为候补（候补不受名额限制）
      result = await SessionModel.updateOne(
        {
          _id: session._id,
          status: "open",
          "registrations.phone": { $ne: phone },
        },
        pushRegistration("waitlist")
      );
    }

    if (result.modifiedCount !== 1) {
      // 仍然失败：场次刚被关闭，或手机号刚被并发写入
      const latest = await this.getSession(sessionId);
      if (latest.status === "closed") {
        throw new AppError(409, "本场组局已关闭招募，不再接受新报名");
      }
      if (latest.registrations.some((item) => item.phone === phone)) {
        throw new AppError(409, "该手机号已在本场报名，无需重复报名");
      }
      throw new AppError(409, "报名失败，请刷新后重试");
    }

    // 报名成功后尝试补位：有空位且有候补时按 FIFO 转正（无空位时为 no-op）
    await this.promoteWaitlist(session._id);

    logger.info(
      `报名成功：${session.gameCode} ${session.date} ${session.slot} ${phone} -> ${
        nextStatus === "registered" ? "入选" : "候补"
      }`
    );
    return this.getSession(sessionId);
  }

  /**
   * 退出报名：
   * - 名单玩家退出后，候补队列最前面的玩家自动转正
   * - 候补玩家退出仅从队列移除，后续候补顺位前移
   */
  async cancel(sessionId: string, phoneInput: unknown): Promise<SessionView> {
    const phone = this.normalizePhone(phoneInput);

    const session = await this.requireSession(sessionId);
    const registrations = session.registrations as RegistrationShape[];
    const target = registrations.find((item) => item.phone === phone);
    if (!target) {
      throw new AppError(404, "该手机号未报名本场组局");
    }
    const wasRegistered = target.status === "registered";

    // 先移除退出者
    await SessionModel.updateOne(
      { _id: session._id },
      { $pull: { registrations: { phone } } }
    );

    // 入选者退出后，候补按 FIFO 自动补位（并发退出时由循环保证补满）
    let promoted = 0;
    if (wasRegistered) {
      promoted = await this.promoteWaitlist(session._id);
    }

    logger.info(
      `退出报名：${session.gameCode} ${session.date} ${session.slot} ${phone}` +
        (promoted > 0 ? `，${promoted} 位候补自动转正` : "")
    );
    return this.getSession(sessionId);
  }

  /**
   * 店长调整人数上限：
   * - 不能低于已经登记（入选）的玩家数
   * - 调高产生空缺席位时，候补按顺序自动补位
   * - 招募已关闭的场次不再调整
   */
  async updateMaxPlayers(sessionId: string, value: unknown): Promise<SessionView> {
    const maxPlayers = Number(value);
    if (
      !Number.isInteger(maxPlayers) ||
      maxPlayers < MAX_PLAYERS_MIN ||
      maxPlayers > MAX_PLAYERS_MAX
    ) {
      throw new AppError(
        400,
        `人数上限需为 ${MAX_PLAYERS_MIN}-${MAX_PLAYERS_MAX} 之间的整数`
      );
    }

    const session = await this.requireSession(sessionId);
    if (session.status === "closed") {
      throw new AppError(409, "招募已关闭的场次不能调整人数上限");
    }
    const registeredCount = this.countStatus(
      session.registrations as RegistrationShape[],
      "registered"
    );
    if (maxPlayers < registeredCount) {
      throw new AppError(
        400,
        `已有 ${registeredCount} 位玩家入选，人数上限不能低于 ${registeredCount}`
      );
    }

    await SessionModel.updateOne({ _id: session._id }, { $set: { maxPlayers } });
    const promoted = await this.promoteWaitlist(session._id);

    logger.info(
      `人数上限调整：${session.gameCode} ${session.date} ${session.slot} -> ${maxPlayers}` +
        (promoted > 0 ? `，${promoted} 位候补转正` : "")
    );
    return this.getSession(sessionId);
  }

  /** 店长关闭招募：拒绝新报名，已有名单与候补顺序保留 */
  async closeRecruitment(sessionId: string): Promise<SessionView> {
    return this.setStatus(sessionId, "closed");
  }

  /** 店长重新开放招募（名单与候补顺序保留不变） */
  async reopenRecruitment(sessionId: string): Promise<SessionView> {
    return this.setStatus(sessionId, "open");
  }

  private async setStatus(
    sessionId: string,
    status: SessionStatusValue
  ): Promise<SessionView> {
    const session = await this.requireSession(sessionId);
    if (session.status !== status) {
      await SessionModel.updateOne({ _id: session._id }, { $set: { status } });
      logger.info(
        `招募${status === "closed" ? "关闭" : "重开"}：${session.gameCode} ${session.date} ${session.slot}`
      );
    }
    return this.getSession(sessionId);
  }

  /** 候补按 FIFO 顺序逐个转正，直到名额填满或候补为空 */
  private async promoteWaitlist(sessionId: unknown): Promise<number> {
    let promotedTotal = 0;
    for (let guard = 0; guard < MAX_PLAYERS_MAX; guard += 1) {
      const session = await this.requireSession(String(sessionId));
      const registrations = session.registrations as RegistrationShape[];
      const registeredCount = this.countStatus(registrations, "registered");
      if (registeredCount >= session.maxPlayers) {
        break;
      }
      const head = registrations
        .filter((item) => item.status === "waitlist")
        .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())[0];
      if (!head) {
        break;
      }
      const result = await SessionModel.updateOne(
        { _id: session._id },
        { $set: { "registrations.$[el].status": "registered" } },
        { arrayFilters: [{ "el._id": head._id, "el.status": "waitlist" }] }
      );
      if (result.modifiedCount !== 1) {
        break;
      }
      promotedTotal += 1;
    }
    return promotedTotal;
  }

  private normalizePhone(phoneInput: unknown): string {
    const phone = String(phoneInput ?? "").trim();
    if (!PHONE_PATTERN.test(phone)) {
      throw new AppError(400, "请填写有效的 11 位手机号");
    }
    return phone;
  }

  private countStatus(
    registrations: RegistrationShape[],
    status: RegistrationStatusValue
  ): number {
    return registrations.filter((item) => item.status === status).length;
  }

  private async requireSession(id: string): Promise<SessionDocument> {
    if (!mongoose.isValidObjectId(id)) {
      throw new AppError(404, "组局不存在");
    }
    const session = (await SessionModel.findById(id)) as SessionDocument | null;
    if (!session) {
      throw new AppError(404, "组局不存在");
    }
    return session;
  }

  private toView(session: SessionDocument): SessionView {
    const game = findGame(session.gameCode) ?? {
      code: session.gameCode,
      name: session.gameCode,
      category: "未分类",
    };
    const slot = findSlot(session.slot) ?? { code: session.slot, label: session.slot };

    const all = session.registrations as RegistrationShape[];
    const waitlistOrder = all
      .filter((reg) => reg.status === "waitlist")
      .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());

    const registrations: RegistrationEntry[] = all.map((item) => {
      const waitlistIndex = waitlistOrder.findIndex(
        (reg) => String(reg._id) === String(item._id)
      );
      return {
        id: String(item._id),
        phone: item.phone,
        maskedPhone: maskPhone(item.phone),
        status: item.status,
        waitlistPosition:
          item.status === "waitlist" && waitlistIndex >= 0
            ? waitlistIndex + 1
            : null,
        joinedAt: new Date(item.joinedAt).toISOString(),
      };
    });

    // 名单在前（按报名时间），候补在后（按候补顺位）
    registrations.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "registered" ? -1 : 1;
      }
      return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
    });

    const registeredCount = registrations.filter(
      (item) => item.status === "registered"
    ).length;
    const waitlistCount = registrations.length - registeredCount;

    return {
      id: String(session._id),
      gameCode: game.code,
      gameName: game.name,
      category: game.category,
      date: session.date,
      slot: session.slot,
      slotLabel: slot.label,
      maxPlayers: session.maxPlayers,
      hostName: session.hostName,
      hostContact: maskPhone(session.hostContact),
      note: session.note,
      status: session.status,
      registeredCount,
      waitlistCount,
      full: registeredCount >= session.maxPlayers,
      createdAt: new Date(session.createdAt).toISOString(),
      registrations,
    };
  }
}
