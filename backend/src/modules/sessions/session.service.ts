import { sessionStore, toSessionView } from "./session.store";
import type {
  CreateSessionInput,
  RegisterInput,
  SessionView,
} from "./session.types";

export class SessionService {
  list(): SessionView[] {
    return sessionStore.list().map(toSessionView);
  }

  create(input: CreateSessionInput): SessionView {
    return toSessionView(sessionStore.create(input));
  }

  register(sessionId: string, input: RegisterInput): SessionView {
    const { session } = sessionStore.register(sessionId, input);
    return toSessionView(session);
  }

  cancel(sessionId: string, phone: string): SessionView {
    return toSessionView(sessionStore.cancel(sessionId, phone));
  }

  updateCapacity(sessionId: string, capacity: number): SessionView {
    return toSessionView(sessionStore.setCapacity(sessionId, capacity));
  }

  close(sessionId: string): SessionView {
    return toSessionView(sessionStore.setStatus(sessionId, "closed"));
  }

  reopen(sessionId: string): SessionView {
    return toSessionView(sessionStore.setStatus(sessionId, "open"));
  }
}
