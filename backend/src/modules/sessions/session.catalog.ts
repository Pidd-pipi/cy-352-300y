import type { GameSummary, TimeSlot } from "./session.types";

/** 可选桌游目录（发布组局时选择） */
export const GAME_CATALOG: GameSummary[] = [
  {
    code: "catan",
    name: "卡坦岛",
    category: "策略",
    minPlayers: 3,
    maxPlayers: 4,
    durationMin: 90,
    difficulty: "中等",
  },
  {
    code: "codenames",
    name: "行动代号",
    category: "聚会",
    minPlayers: 4,
    maxPlayers: 10,
    durationMin: 30,
    difficulty: "轻松",
  },
  {
    code: "werewolf",
    name: "狼人杀",
    category: "角色扮演",
    minPlayers: 6,
    maxPlayers: 12,
    durationMin: 60,
    difficulty: "中等",
  },
  {
    code: "botc",
    name: "血染钟楼",
    category: "角色扮演",
    minPlayers: 5,
    maxPlayers: 15,
    durationMin: 90,
    difficulty: "烧脑",
  },
  {
    code: "cascadia",
    name: "卡斯卡迪亚",
    category: "策略",
    minPlayers: 1,
    maxPlayers: 4,
    durationMin: 45,
    difficulty: "轻松",
  },
  {
    code: "uno",
    name: "UNO",
    category: "卡牌",
    minPlayers: 2,
    maxPlayers: 10,
    durationMin: 20,
    difficulty: "轻松",
  },
  {
    code: "cockroach-poker",
    name: "蟑螂沙拉",
    category: "卡牌",
    minPlayers: 2,
    maxPlayers: 6,
    durationMin: 20,
    difficulty: "轻松",
  },
  {
    code: "decrypto",
    name: "截报机密",
    category: "聚会",
    minPlayers: 3,
    maxPlayers: 8,
    durationMin: 30,
    difficulty: "中等",
  },
];

/** 可报名的时段 */
export const TIME_SLOTS: TimeSlot[] = [
  { code: "morning", label: "上午 10:00-13:00" },
  { code: "afternoon", label: "下午 14:00-17:00" },
  { code: "evening", label: "晚间 18:30-22:00" },
];

export function findGame(gameCode: string): GameSummary | undefined {
  return GAME_CATALOG.find((game) => game.code === gameCode);
}

export function findSlot(slotCode: string): TimeSlot | undefined {
  return TIME_SLOTS.find((slot) => slot.code === slotCode);
}
