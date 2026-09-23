<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  cancelRegistration,
  closeSession,
  registerSession,
  reopenSession,
  updateSessionCapacity,
} from "../api/client";
import type { SessionView } from "../types/session";

const props = defineProps<{ session: SessionView }>();
const emit = defineEmits<{ changed: [] }>();

const joinPhone = ref("");
const leavePhone = ref("");
const joining = ref(false);
const leaving = ref(false);
const capacityDraft = ref(props.session.maxPlayers);
const savingCapacity = ref(false);
const switchingStatus = ref(false);

// 轮询刷新后同步最新人数上限到输入框
watch(
  () => props.session.maxPlayers,
  (value) => {
    capacityDraft.value = value;
  }
);

const registered = computed(() =>
  props.session.registrations.filter((item) => item.status === "registered")
);
const waitlist = computed(() =>
  props.session.registrations.filter((item) => item.status === "waitlist")
);
const closed = computed(() => props.session.status === "closed");

function showError(error: unknown) {
  ElMessage.error(error instanceof Error ? error.message : "操作失败，请稍后重试");
}

async function handleJoin() {
  const phone = joinPhone.value.trim();
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    ElMessage.warning("请填写有效的 11 位手机号");
    return;
  }
  joining.value = true;
  try {
    const updated = await registerSession(props.session.id, phone);
    const mine = updated.registrations.find((item) => item.phone === phone);
    if (mine?.status === "waitlist") {
      ElMessage.info(`本场已满，你已进入候补队列第 ${mine.waitlistPosition} 位`);
    } else {
      ElMessage.success("报名成功，已占一个席位");
    }
    joinPhone.value = "";
    emit("changed");
  } catch (error) {
    showError(error);
  } finally {
    joining.value = false;
  }
}

async function handleLeave() {
  const phone = leavePhone.value.trim();
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    ElMessage.warning("请填写报名时使用的手机号");
    return;
  }
  try {
    await ElMessageBox.confirm(
      "退出后你的位置将让出；若你在候补队列，后续候补顺位会前移。",
      "确认退出报名？",
      { confirmButtonText: "退出报名", cancelButtonText: "再想想", type: "warning" }
    );
  } catch {
    return;
  }
  leaving.value = true;
  try {
    await cancelRegistration(props.session.id, phone);
    ElMessage.success("已退出报名");
    leavePhone.value = "";
    emit("changed");
  } catch (error) {
    showError(error);
  } finally {
    leaving.value = false;
  }
}

async function handleSaveCapacity() {
  const value = Number(capacityDraft.value);
  if (!Number.isInteger(value) || value < 2 || value > 30) {
    ElMessage.warning("人数上限需为 2-30 之间的整数");
    return;
  }
  savingCapacity.value = true;
  try {
    const updated = await updateSessionCapacity(props.session.id, value);
    const promoted = updated.registeredCount - props.session.registeredCount;
    ElMessage.success(
      promoted > 0 ? `人数上限已更新，${promoted} 位候补已自动转正` : "人数上限已更新"
    );
    emit("changed");
  } catch (error) {
    capacityDraft.value = props.session.maxPlayers;
    showError(error);
  } finally {
    savingCapacity.value = false;
  }
}

async function handleToggleStatus() {
  switchingStatus.value = true;
  try {
    if (closed.value) {
      await ElMessageBox.confirm(
        "重开后将接受新的报名与候补，现有名单和候补顺序保持不变。",
        "重新开放招募？",
        { confirmButtonText: "重开招募", cancelButtonText: "取消" }
      );
      await reopenSession(props.session.id);
      ElMessage.success("招募已重新开放");
    } else {
      await ElMessageBox.confirm(
        "关闭后新报名会被拒绝，已有名单和候补顺序都会保留。",
        "确认关闭招募？",
        {
          confirmButtonText: "关闭招募",
          cancelButtonText: "取消",
          type: "warning",
        }
      );
      await closeSession(props.session.id);
      ElMessage.success("招募已关闭");
    }
    emit("changed");
  } catch (error) {
    if (error !== "cancel" && error !== undefined) {
      showError(error);
    }
  } finally {
    switchingStatus.value = false;
  }
}
</script>

<template>
  <article class="session-card" :class="{ 'is-closed': closed }">
    <header class="session-head">
      <div class="session-title">
        <div class="session-name-row">
          <h3>{{ session.gameName }}</h3>
          <el-tag size="small" effect="plain" type="info">{{ session.category }}</el-tag>
          <el-tag
            size="small"
            :type="closed ? 'danger' : session.full ? 'warning' : 'success'"
          >
            {{ closed ? "招募已关闭" : session.full ? "已满员 · 候补中" : "招募中" }}
          </el-tag>
        </div>
        <p class="session-time">📅 {{ session.date }} ｜ {{ session.slotLabel }}</p>
      </div>
      <div class="seat-gauges">
        <div class="seat-number">
          <strong>{{ session.registeredCount }}/{{ session.maxPlayers }}</strong>
          <span>已入选</span>
        </div>
        <el-progress
          :percentage="Math.min(100, Math.round((session.registeredCount / session.maxPlayers) * 100))"
          :stroke-width="8"
          :show-text="false"
          :status="session.full ? 'warning' : undefined"
          class="seat-progress"
        />
      </div>
    </header>

    <p v-if="session.note" class="session-note">{{ session.note }}</p>
    <p class="session-host">发起人：{{ session.hostName }}（{{ session.hostContact }}）</p>

    <!-- 报名区 -->
    <div class="join-box">
      <template v-if="closed">
        <el-alert
          title="店长已关闭本场招募，不再接受新报名；下方名单与候补顺序仍保留。"
          type="error"
          :closable="false"
          show-icon
        />
      </template>
      <template v-else>
        <el-input
          v-model="joinPhone"
          maxlength="11"
          placeholder="填写手机号报名拼车（满员后自动进入候补）"
          @keyup.enter="handleJoin"
        >
          <template #prepend>📱</template>
        </el-input>
        <el-button type="primary" :loading="joining" @click="handleJoin">
          我要报名
        </el-button>
      </template>
    </div>

    <!-- 名单与候补 -->
    <div class="roster">
      <div class="roster-section">
        <h4>入选名单（{{ registered.length }}/{{ session.maxPlayers }}）</h4>
        <el-empty
          v-if="registered.length === 0"
          description="暂时还没有人报名"
          :image-size="56"
        />
        <ul v-else class="roster-list">
          <li v-for="(item, index) in registered" :key="item.id" class="roster-item">
            <span class="roster-index">{{ index + 1 }}</span>
            <span class="roster-phone">{{ item.maskedPhone }}</span>
            <el-tag size="small" type="success">入选</el-tag>
          </li>
        </ul>
      </div>

      <div class="roster-section">
        <h4>候补队列（{{ waitlist.length }}）</h4>
        <el-empty
          v-if="waitlist.length === 0"
          description="暂无候补"
          :image-size="56"
        />
        <ul v-else class="roster-list">
          <li
            v-for="item in waitlist"
            :key="item.id"
            class="roster-item"
            :class="{ 'roster-head': item.waitlistPosition === 1 }"
          >
            <span class="roster-index">{{ item.waitlistPosition }}</span>
            <span class="roster-phone">{{ item.maskedPhone }}</span>
            <el-tag size="small" :type="item.waitlistPosition === 1 ? 'warning' : 'info'">
              {{ item.waitlistPosition === 1 ? "候补队首 · 有位先转正" : "候补中" }}
            </el-tag>
          </li>
        </ul>
      </div>
    </div>

    <!-- 退出报名 -->
    <div class="leave-box">
      <el-input
        v-model="leavePhone"
        maxlength="11"
        placeholder="填写报名手机号退出（有人退出时候补队首自动转正）"
        @keyup.enter="handleLeave"
      >
        <template #prepend>退出</template>
      </el-input>
      <el-button :loading="leaving" @click="handleLeave">退出报名</el-button>
    </div>

    <!-- 店长操作 -->
    <div class="manager-box">
      <span class="manager-label">店长操作</span>
      <div class="manager-actions">
        <div class="capacity-control">
          <span>人数上限</span>
          <el-input-number
            v-model="capacityDraft"
            :min="Math.max(2, session.registeredCount)"
            :max="30"
            size="small"
          />
          <el-button
            size="small"
            type="primary"
            plain
            :disabled="closed || capacityDraft === session.maxPlayers"
            :loading="savingCapacity"
            @click="handleSaveCapacity"
          >
            保存
          </el-button>
          <span class="capacity-hint">不可低于已登记 {{ session.registeredCount }} 人</span>
        </div>
        <el-button
          size="small"
          :type="closed ? 'success' : 'danger'"
          plain
          :loading="switchingStatus"
          @click="handleToggleStatus"
        >
          {{ closed ? "重新开放招募" : "关闭招募" }}
        </el-button>
      </div>
    </div>
  </article>
</template>
