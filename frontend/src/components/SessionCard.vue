<script setup lang="ts">
import { computed, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useSessions } from "../state/sessions";
import type { Registration, SessionView } from "../types";
import RegisterDialog from "./RegisterDialog.vue";

const props = defineProps<{ session: SessionView }>();

const { cancel, changeCapacity, close, reopen } = useSessions();

const registerVisible = ref(false);
const capacityEditing = ref(false);
const capacityDraft = ref(props.session.capacity);

const confirmed = computed(() =>
  props.session.registrations.filter((item) => item.status === "confirmed"),
);
const waitlist = computed(() =>
  props.session.registrations.filter((item) => item.status === "waitlist"),
);

const closed = computed(() => props.session.status === "closed");

function startRegister() {
  if (closed.value) {
    ElMessage.error("本场已关闭招募，不再接受新报名");
    return;
  }
  registerVisible.value = true;
}

async function handleCancel(registration: Registration) {
  try {
    await ElMessageBox.confirm(
      `确认为 ${registration.nickname}（${registration.phone}）退出报名？`,
      "退出报名",
      { type: "warning", confirmButtonText: "确认退出", cancelButtonText: "再想想" },
    );
  } catch {
    return;
  }

  const wasConfirmed = registration.status === "confirmed";
  const hadWaitlist = waitlist.value.length > 0;

  try {
    await cancel(props.session.id, registration.phone);
    if (wasConfirmed && hadWaitlist) {
      ElMessage.success("已退出，候补队列首位玩家已自动转正");
    } else {
      ElMessage.success("已退出报名");
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "退出失败");
  }
}

function startEditCapacity() {
  capacityDraft.value = props.session.capacity;
  capacityEditing.value = true;
}

async function saveCapacity() {
  if (capacityDraft.value === props.session.capacity) {
    capacityEditing.value = false;
    return;
  }
  try {
    await changeCapacity(props.session.id, capacityDraft.value);
    ElMessage.success("人数上限已更新，候补已按顺序补位");
    capacityEditing.value = false;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "更新失败");
  }
}

async function handleClose() {
  try {
    await ElMessageBox.confirm(
      "关闭后将拒绝一切新报名；已确认名单和候补顺序都会原样保留。",
      "关闭招募",
      { type: "warning", confirmButtonText: "确认关闭", cancelButtonText: "取消" },
    );
  } catch {
    return;
  }
  try {
    await close(props.session.id);
    ElMessage.success("招募已关闭");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "操作失败");
  }
}

async function handleReopen() {
  try {
    await reopen(props.session.id);
    ElMessage.success("招募已重新开放");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "操作失败");
  }
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
</script>

<template>
  <el-card class="session-card" :class="{ 'is-closed': closed }" shadow="never">
    <header class="session-head">
      <div class="session-title">
        <h3>{{ session.game }}</h3>
        <el-tag :type="closed ? 'info' : session.full ? 'warning' : 'success'" effect="light">
          {{ closed ? "招募已关闭" : session.full ? "已满员 · 候补中" : `还差 ${session.seatsLeft} 人` }}
        </el-tag>
      </div>
      <div class="session-meta">
        <span>📅 {{ session.date }} {{ session.timeSlot }}</span>
        <span class="capacity-control">
          👥
          <template v-if="!capacityEditing">
            {{ session.confirmedCount }}/{{ session.capacity }} 人
            <el-button link type="primary" size="small" @click="startEditCapacity">调整</el-button>
          </template>
          <template v-else>
            <el-input-number
              v-model="capacityDraft"
              :min="session.confirmedCount"
              :max="99"
              size="small"
            />
            <el-button link type="primary" size="small" @click="saveCapacity">保存</el-button>
            <el-button link size="small" @click="capacityEditing = false">取消</el-button>
          </template>
        </span>
      </div>
    </header>

    <div class="roster">
      <div class="roster-group">
        <p class="roster-label">
          已确认 <em>{{ confirmed.length }}</em>
        </p>
        <el-empty v-if="confirmed.length === 0" description="还没有人报名" :image-size="48" />
        <ul v-else class="roster-list">
          <li v-for="item in confirmed" :key="item.id" class="roster-item is-confirmed">
            <span class="roster-name">
              <el-tag type="success" size="small" effect="dark">已确认</el-tag>
              {{ item.nickname }}
            </span>
            <span class="roster-phone">{{ item.phone }}</span>
            <span class="roster-time">{{ formatTime(item.joinedAt) }}</span>
            <el-button link type="danger" size="small" @click="handleCancel(item)">退出</el-button>
          </li>
        </ul>
      </div>

      <div v-if="waitlist.length > 0" class="roster-group">
        <p class="roster-label">
          候补队列 <em>{{ waitlist.length }}</em>
          <span class="roster-hint">有人退出时队首自动转正</span>
        </p>
        <ul class="roster-list">
          <li
            v-for="(item, index) in waitlist"
            :key="item.id"
            class="roster-item is-waiting"
          >
            <span class="roster-name">
              <el-tag type="warning" size="small" effect="plain">候补 #{{ index + 1 }}</el-tag>
              {{ item.nickname }}
            </span>
            <span class="roster-phone">{{ item.phone }}</span>
            <span class="roster-time">{{ formatTime(item.joinedAt) }}</span>
            <el-button link type="danger" size="small" @click="handleCancel(item)">退出</el-button>
          </li>
        </ul>
      </div>
    </div>

    <footer class="session-actions">
      <el-button type="primary" :disabled="closed" @click="startRegister">
        {{ session.full ? "报名进候补" : "我要报名" }}
      </el-button>
      <el-button v-if="!closed" type="info" plain @click="handleClose">店长关闭招募</el-button>
      <el-button v-else type="success" plain @click="handleReopen">重新开放招募</el-button>
    </footer>

    <RegisterDialog
      v-model:visible="registerVisible"
      :session="session"
    />
  </el-card>
</template>
