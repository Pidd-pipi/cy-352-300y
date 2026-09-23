<script setup lang="ts">
import { reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import type { FormInstance, FormRules } from "element-plus";
import { GAME_OPTIONS, MAX_CAPACITY, MIN_CAPACITY, TIME_SLOTS } from "../constants/sessions";
import { useSessions } from "../state/sessions";

const emit = defineEmits<{ published: [] }>();

const { publish } = useSessions();
const formRef = ref<FormInstance>();
const submitting = ref(false);

function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function isPastDate(date: Date): boolean {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return date.getTime() < todayStart.getTime();
}

const form = reactive({
  game: "",
  date: today(),
  timeSlot: "",
  capacity: 6,
});

const rules: FormRules = {
  game: [{ required: true, message: "请选择或输入桌游", trigger: "change" }],
  date: [{ required: true, message: "请选择日期", trigger: "change" }],
  timeSlot: [{ required: true, message: "请选择时段", trigger: "change" }],
  capacity: [
    {
      type: "number",
      min: MIN_CAPACITY,
      max: MAX_CAPACITY,
      message: `人数上限需在 ${MIN_CAPACITY} - ${MAX_CAPACITY} 之间`,
      trigger: "change",
    },
  ],
};

async function handleSubmit() {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    await publish({ ...form, game: form.game.trim() });
    ElMessage.success("组局已发布，快邀请小伙伴来拼车吧");
    emit("published");
    form.game = "";
    form.timeSlot = "";
    form.capacity = 6;
    form.date = today();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "发布失败");
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <el-card class="publish-card" shadow="never">
    <template #header>
      <strong>发布组局</strong>
      <span class="card-sub">选择桌游、日期时段和人数上限</span>
    </template>
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      @submit.prevent
    >
      <el-form-item label="桌游" prop="game">
        <el-select
          v-model="form.game"
          filterable
          allow-create
          default-first-option
          placeholder="选择或输入桌游名称"
          style="width: 100%"
        >
          <el-option
            v-for="game in GAME_OPTIONS"
            :key="game"
            :label="game"
            :value="game"
          />
        </el-select>
      </el-form-item>
      <div class="form-row">
        <el-form-item label="日期" prop="date">
          <el-date-picker
            v-model="form.date"
            type="date"
            value-format="YYYY-MM-DD"
            :disabled-date="isPastDate"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="时段" prop="timeSlot">
          <el-select v-model="form.timeSlot" placeholder="选择时段" style="width: 100%">
            <el-option
              v-for="slot in TIME_SLOTS"
              :key="slot.value"
              :label="slot.label"
              :value="slot.value"
            />
          </el-select>
        </el-form-item>
      </div>
      <el-form-item label="人数上限" prop="capacity">
        <el-input-number v-model="form.capacity" :min="MIN_CAPACITY" :max="MAX_CAPACITY" />
        <span class="form-hint">满员后新报名自动进入候补队列</span>
      </el-form-item>
      <el-button type="primary" :loading="submitting" style="width: 100%" @click="handleSubmit">
        发布组局
      </el-button>
    </el-form>
  </el-card>
</template>
