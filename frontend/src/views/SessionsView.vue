<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { fetchCatalog, fetchSessions } from "../api/client";
import type {
  GameSummary,
  SessionCatalog,
  SessionView,
} from "../types/session";
import SessionCard from "../components/SessionCard.vue";
import PublishSessionDialog from "../components/PublishSessionDialog.vue";

type FilterValue = "all" | "open" | "closed" | "full";

const sessions = ref<SessionView[]>([]);
const games = ref<GameSummary[]>([]);
const slots = ref<SessionCatalog["slots"]>([]);
const loading = ref(false);
const loadError = ref("");
const dialogVisible = ref(false);
const filter = ref<FilterValue>("all");

let timer: number | undefined;

const filteredSessions = computed(() => {
  if (filter.value === "all") {
    return sessions.value;
  }
  if (filter.value === "open") {
    return sessions.value.filter((session) => session.status === "open" && !session.full);
  }
  if (filter.value === "full") {
    return sessions.value.filter((session) => session.full && session.status === "open");
  }
  return sessions.value.filter((session) => session.status === "closed");
});

const stats = computed(() => ({
  total: sessions.value.length,
  open: sessions.value.filter((session) => session.status === "open" && !session.full).length,
  full: sessions.value.filter((session) => session.full && session.status === "open").length,
  closed: sessions.value.filter((session) => session.status === "closed").length,
}));

async function loadSessions(options: { silent?: boolean } = {}) {
  if (!options.silent) {
    loading.value = true;
  }
  try {
    sessions.value = await fetchSessions();
    loadError.value = "";
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : "组局加载失败";
    if (!options.silent) {
      ElMessage.error(loadError.value);
    }
  } finally {
    loading.value = false;
  }
}

async function loadCatalog() {
  try {
    const catalog = await fetchCatalog();
    games.value = catalog.games;
    slots.value = catalog.slots;
  } catch {
    // 目录加载失败时无法发布新组局，但不影响浏览已有组局
    ElMessage.error("桌游目录加载失败，暂时无法发布组局");
  }
}

function handleCreated() {
  loadSessions();
}

onMounted(() => {
  loadCatalog();
  loadSessions();
  // 多人同时报名时，每 10 秒静默同步一次名单与候补顺位
  timer = window.setInterval(() => loadSessions({ silent: true }), 10_000);
});

onBeforeUnmount(() => {
  if (timer) {
    window.clearInterval(timer);
  }
});
</script>

<template>
  <section class="workspace sessions-view">
    <div class="sessions-hero">
      <div>
        <h2>组局拼车广场</h2>
        <p>
          选桌游、定日期时段和人数上限即可发布组局；填写手机号登记拼车，满员后自动进入候补，
          有人退出时队首候补自动转正。同一手机号在同一场只占一个位置。
        </p>
      </div>
      <el-button type="primary" size="large" @click="dialogVisible = true">
        ＋ 发布组局
      </el-button>
    </div>

    <div class="session-toolbar">
      <el-radio-group v-model="filter" size="default">
        <el-radio-button value="all">全部（{{ stats.total }}）</el-radio-button>
        <el-radio-button value="open">可报名（{{ stats.open }}）</el-radio-button>
        <el-radio-button value="full">满员候补（{{ stats.full }}）</el-radio-button>
        <el-radio-button value="closed">已关闭（{{ stats.closed }}）</el-radio-button>
      </el-radio-group>
      <el-button :loading="loading" plain @click="loadSessions()">刷新名单</el-button>
    </div>

    <el-alert
      v-if="loadError"
      :title="loadError"
      type="error"
      show-icon
      :closable="false"
      class="sessions-error"
    />

    <div v-loading="loading" class="session-grid">
      <SessionCard
        v-for="session in filteredSessions"
        :key="session.id"
        :session="session"
        @changed="loadSessions({ silent: true })"
      />
    </div>

    <el-empty
      v-if="!loading && filteredSessions.length === 0"
      description="当前筛选条件下还没有组局，去发布第一场吧"
    />

    <PublishSessionDialog
      v-model="dialogVisible"
      :games="games"
      :slots="slots"
      @created="handleCreated"
    />
  </section>
</template>
