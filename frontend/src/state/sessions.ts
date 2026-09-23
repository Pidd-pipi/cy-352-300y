import { computed, ref } from "vue";
import {
  cancelRegistration,
  closeSession,
  createSession,
  fetchSessions,
  registerForSession,
  reopenSession,
  updateSessionCapacity,
} from "../api/sessions";
import type {
  CreateSessionPayload,
  RegisterPayload,
  SessionView,
} from "../types";

const sessions = ref<SessionView[]>([]);
const loading = ref(false);
const loaded = ref(false);

export function useSessions() {
  async function load() {
    loading.value = true;
    try {
      const { items } = await fetchSessions();
      sessions.value = items;
      loaded.value = true;
    } finally {
      loading.value = false;
    }
  }

  async function publish(payload: CreateSessionPayload) {
    const created = await createSession(payload);
    sessions.value = [created, ...sessions.value];
  }

  async function register(sessionId: string, payload: RegisterPayload) {
    const updated = await registerForSession(sessionId, payload);
    replaceSession(updated);
    return updated;
  }

  async function cancel(sessionId: string, phone: string) {
    const updated = await cancelRegistration(sessionId, phone);
    replaceSession(updated);
  }

  async function changeCapacity(sessionId: string, capacity: number) {
    const updated = await updateSessionCapacity(sessionId, capacity);
    replaceSession(updated);
  }

  async function close(sessionId: string) {
    replaceSession(await closeSession(sessionId));
  }

  async function reopen(sessionId: string) {
    replaceSession(await reopenSession(sessionId));
  }

  function replaceSession(updated: SessionView) {
    sessions.value = sessions.value.map((item) =>
      item.id === updated.id ? updated : item,
    );
  }

  const totalConfirmed = computed(() =>
    sessions.value.reduce((sum, item) => sum + item.confirmedCount, 0),
  );
  const totalWaitlist = computed(() =>
    sessions.value.reduce((sum, item) => sum + item.waitlistCount, 0),
  );

  return {
    sessions,
    loading,
    loaded,
    totalConfirmed,
    totalWaitlist,
    load,
    publish,
    register,
    cancel,
    changeCapacity,
    close,
    reopen,
  };
}
