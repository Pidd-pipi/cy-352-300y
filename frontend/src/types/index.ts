export interface FeatureItem {
  id: number;
  title: string;
  description: string;
  status: string;
  metric: string;
}

export interface KpiItem {
  label: string;
  value: string;
  trend: string;
  tone: string;
}

export interface OperationRecord {
  key: string;
  name: string;
  owner: string;
  status: string;
  metric: string;
  priority: string;
}

export interface OverviewResponse {
  appName: string;
  appCode: string;
  description: string;
  features: FeatureItem[];
  kpis: KpiItem[];
  records: OperationRecord[];
}

export type SessionStatus = "open" | "closed";
export type RegistrationStatus = "confirmed" | "waitlist";

export interface Registration {
  id: string;
  phone: string;
  nickname: string;
  status: RegistrationStatus;
  joinedAt: string;
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

export interface CreateSessionPayload {
  game: string;
  date: string;
  timeSlot: string;
  capacity: number;
}

export interface RegisterPayload {
  phone: string;
  nickname?: string;
}
