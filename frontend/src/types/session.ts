export interface GameSummary {
  code: string;
  name: string;
  category: string;
  minPlayers: number;
  maxPlayers: number;
  durationMin: number;
  difficulty: string;
}

export interface TimeSlot {
  code: string;
  label: string;
}

export interface SessionCatalog {
  games: GameSummary[];
  slots: TimeSlot[];
}

export type SessionStatus = "open" | "closed";
export type RegistrationStatus = "registered" | "waitlist";

export interface RegistrationEntry {
  id: string;
  phone: string;
  maskedPhone: string;
  status: RegistrationStatus;
  waitlistPosition: number | null;
  joinedAt: string;
}

export interface SessionView {
  id: string;
  gameCode: string;
  gameName: string;
  category: string;
  date: string;
  slot: string;
  slotLabel: string;
  maxPlayers: number;
  hostName: string;
  hostContact: string;
  note: string;
  status: SessionStatus;
  registeredCount: number;
  waitlistCount: number;
  full: boolean;
  createdAt: string;
  registrations: RegistrationEntry[];
}

export interface CreateSessionPayload {
  gameCode: string;
  date: string;
  slot: string;
  maxPlayers: number;
  hostName: string;
  hostContact: string;
  note?: string;
}
