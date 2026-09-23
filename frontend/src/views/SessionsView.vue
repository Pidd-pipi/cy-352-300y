<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { ElMessage } from "element-plus";
import SessionPublishForm from "../components/SessionPublishForm.vue";
import SessionCard from "../components/SessionCard.vue";
import { useSessions } from "../state/sessions";

const {
  sessions,
  loading,
  load,
  totalConfirmed,
  totalWaitlist,
} = useSessions();

const filter = ref<"all" | "open" | "closed">("all");

const filteredSessions = computed(() => {
  if (filter.value === "all") return sessions.value;
  return sessions.value.filter((item) => item.status === filter.value);
});

const activeCount = computed(
  () => sessions.value.filter((item) => item.status === "open").length,
);

async function refresh(showError = true) {
  try {
    await load();
  } catch (error) {
    if (showError) {
      ElMessage.error(error instanceof Error ? error.message : "加载失败");
    }
  }
}

onMounted(async () => {
  await refresh();
  // 多人拼车场景下保持页面数据新鲜
  timer = window.setInterval(() => refresh(false), 5000);
});

let timer: number | undefined;
onUnmounted(() => window.clearInterval(timer));
</script>

<template>
  <section class="workspace sessions-page">
    <div class="sessions-layout">
      <aside class="sessions-side">
        <SessionPublishForm @published="refresh" />
        <el-card class="stat-card" shadow="never">
          <div class="stat-row"><span>招募中</span><strong>{{ activeCount }} 场</strong></div>
          <div class="stat-row"><span>已确认席位</span><strong>{{ totalConfirmed }} 人</strong></div>
          <div class="stat-row"><span>候补中</span><strong>{{ totalWaitlist }} 人</strong></div>
          <el-button plain style="width: 100%; margin-top: 12px" @click="refresh">
            刷新名单
          </el-button>
        </el-card>
      </aside>

      <div class="sessions-main">
        <div class="sessions-toolbar">
          <h2>拼车广场</h2>
          <el-radio-group v-model="filter" size="default">
            <el-radio-button label="all">全部</el-radio-button>
            <el-radio-button label="open">招募中</el-radio-button>
            <el-radio-button label="closed">已关闭</el-radio-button>
          </el-radio-group>
        </div>

        <el-skeleton v-if="loading && sessions.length === 0" :rows="6" animated />

        <el-empty
          v-else-if="filteredSessions.length === 0"
          description="还没有组局，发布第一场拼车吧"
        />

        <div v-else class="session-list">
          <SessionCard
            v-for="session in filteredSessions"
            :key="session.id"
            :session="session"
          />
        </div>
      </div>
    </div>
  </section>
</template>
