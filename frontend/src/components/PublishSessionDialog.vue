<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import type { FormInstance, FormRules } from "element-plus";
import { createSession } from "../api/client";
import type { GameSummary, SessionView, TimeSlot } from "../types/session";

const props = defineProps<{
  modelValue: boolean;
  games: GameSummary[];
  slots: TimeSlot[];
}>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  created: [session: SessionView];
}>();

const formRef = ref<FormInstance>();
const submitting = ref(false);

function defaultForm() {
  return {
    gameCode: "",
    date: "",
    slot: "",
    maxPlayers: 6,
    hostName: "",
    hostContact: "",
    note: "",
  };
}

const form = reactive(defaultForm());

const rules: FormRules = {
  gameCode: [{ required: true, message: "请选择桌游", trigger: "change" }],
  date: [{ required: true, message: "请选择日期", trigger: "change" }],
  slot: [{ required: true, message: "请选择时段", trigger: "change" }],
  maxPlayers: [{ required: true, message: "请设置人数上限", trigger: "change" }],
  hostName: [
    { required: true, message: "请填写发起人昵称", trigger: "blur" },
    { max: 20, message: "昵称最长 20 个字符", trigger: "blur" },
  ],
  hostContact: [
    { required: true, message: "请填写手机号", trigger: "blur" },
    {
      pattern: /^1[3-9]\d{9}$/,
      message: "请填写有效的 11 位手机号",
      trigger: "blur",
    },
  ],
};

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      Object.assign(form, defaultForm());
      formRef.value?.clearValidate();
    }
  }
);

function closeDialog() {
  emit("update:modelValue", false);
}

async function handleSubmit() {
  if (!formRef.value) {
    return;
  }
  try {
    await formRef.value.validate();
  } catch {
    return;
  }
  submitting.value = true;
  try {
    const created = await createSession({ ...form, note: form.note.trim() });
    ElMessage.success("组局已发布到拼车广场");
    emit("created", created);
    closeDialog();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "发布失败，请稍后重试");
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="发布组局"
    width="min(520px, 92vw)"
    @close="closeDialog"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="92px"
      label-position="right"
    >
      <el-form-item label="桌游" prop="gameCode">
        <el-select v-model="form.gameCode" placeholder="选择要玩的桌游" style="width: 100%">
          <el-option
            v-for="game in games"
            :key="game.code"
            :label="`${game.name}（${game.category} · ${game.minPlayers}-${game.maxPlayers}人 · 约${game.durationMin}分钟）`"
            :value="game.code"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="日期" prop="date">
        <el-date-picker
          v-model="form.date"
          type="date"
          placeholder="选择组局日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          :disabled-date="(date: Date) => date.getTime() < Date.now() - 24 * 3600 * 1000"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item label="时段" prop="slot">
        <el-radio-group v-model="form.slot">
          <el-radio-button
            v-for="slotOption in slots"
            :key="slotOption.code"
            :value="slotOption.code"
          >
            {{ slotOption.label }}
          </el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="人数上限" prop="maxPlayers">
        <el-input-number v-model="form.maxPlayers" :min="2" :max="30" />
        <span class="form-hint">满员后报名自动转候补，店长不能调到低于已登记人数</span>
      </el-form-item>

      <el-form-item label="发起人" prop="hostName">
        <el-input v-model="form.hostName" maxlength="20" placeholder="昵称，如：小鹿店长" />
      </el-form-item>

      <el-form-item label="联系手机" prop="hostContact">
        <el-input v-model="form.hostContact" maxlength="11" placeholder="用于玩家联系的 11 位手机号" />
      </el-form-item>

      <el-form-item label="备注">
        <el-input
          v-model="form.note"
          type="textarea"
          maxlength="200"
          show-word-limit
          :rows="3"
          placeholder="规则说明、新手友好程度等（选填）"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        发布组局
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.form-hint {
  margin-left: 12px;
  font-size: 12px;
  color: #7a8699;
}
</style>
