export type SessionStatus = "open" | "closed";
export type RegistrationStatus = "confirmed" | "waitlist";

export interface Registration {
  id: string;
  phone: string;
  nickname: string;
  status: RegistrationStatus;
  joinedAt: string;
}

export interface GameSession {
  id: string;
  game: string;
  date: string;
  timeSlot: string;
  capacity: number;
  status: SessionStatus;
  registrations: Registration[];
  createdAt: string;
}

export interface CreateSessionInput {
  game: string;
  date: string;
  timeSlot: string;
  capacity: number;
}

export interface RegisterInput {
  phone: string;
  nickname?: string;
}

export interface SessionView {
  id: string;
  game: string;
  date: string;
  timeSlot: string;
  capacity: number;
  status: SessionStatus;
  confirmedCount: number;
  waitlistCount: number;
  seatsLeft: number;
  full: boolean;
  registrations: Registration[];
  createdAt: string;
}
