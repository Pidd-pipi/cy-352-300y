import { SessionModel } from "./session.model";

/** 返回相对今天 offset 天的 YYYY-MM-DD（本地时区，避免 UTC 偏移） */
function localDateOffset(offsetDays: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function entry(
  phone: string,
  status: "registered" | "waitlist",
  order: number
) {
  // 用固定的先后时间戳体现候补 FIFO 顺序
  return {
    phone,
    status,
    joinedAt: new Date(Date.now() - (100 - order) * 60_000),
  };
}

/**
 * 首次启动（集合为空）时播种演示组局，
 * 覆盖满员 + 候补、开放可报名、已关闭招募等状态。
 */
export async function seedSessions(): Promise<void> {
  const count = await SessionModel.countDocuments();
  if (count > 0) {
    return;
  }

  await SessionModel.create([
    {
      // 满员 + 2 位候补，用于演示退出后队首自动转正
      gameCode: "catan",
      date: localDateOffset(3),
      slot: "evening",
      maxPlayers: 4,
      hostName: "小鹿店长",
      hostContact: "13800000001",
      note: "经典德式策略局，新手也欢迎，店长现场教学。",
      status: "open",
      registrations: [
        entry("13900000001", "registered", 1),
        entry("13900000002", "registered", 2),
        entry("13900000003", "registered", 3),
        entry("13900000004", "registered", 4),
        entry("13900000005", "waitlist", 5),
        entry("13900000006", "waitlist", 6),
      ],
    },
    {
      // 开放报名中，尚有空位
      gameCode: "werewolf",
      date: localDateOffset(2),
      slot: "afternoon",
      maxPlayers: 10,
      hostName: "阿凯",
      hostContact: "13800000002",
      note: "狼人杀娱乐局，不贴脸不场外，欢迎各位影帝影后。",
      status: "open",
      registrations: [
        entry("13700000001", "registered", 1),
        entry("13700000002", "registered", 2),
        entry("13700000003", "registered", 3),
      ],
    },
    {
      // 店长已关闭招募：名单与候补保留，但拒绝新报名
      gameCode: "botc",
      date: localDateOffset(1),
      slot: "evening",
      maxPlayers: 8,
      hostName: "喵喵",
      hostContact: "13800000003",
      note: "血染钟楼暗流涌动，已锁车。",
      status: "closed",
      registrations: [
        entry("13600000001", "registered", 1),
        entry("13600000002", "registered", 2),
        entry("13600000003", "registered", 3),
        entry("13600000004", "registered", 4),
        entry("13600000005", "registered", 5),
        entry("13600000006", "waitlist", 6),
      ],
    },
    {
      // 轻松聚会局，空位充足
      gameCode: "codenames",
      date: localDateOffset(5),
      slot: "morning",
      maxPlayers: 8,
      hostName: "糖糖",
      hostContact: "13800000004",
      note: "行动代号热身晨场，30 分钟一局，随到随玩。",
      status: "open",
      registrations: [entry("13500000001", "registered", 1)],
    },
  ]);

  console.log("[lpboardgame] 已写入组局演示数据");
}
