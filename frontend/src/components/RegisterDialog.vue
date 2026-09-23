<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import type { FormInstance, FormRules } from "element-plus";
import { useSessions } from "../state/sessions";
import type { SessionView } from "../types";

const props = defineProps<{ visible: boolean; session: SessionView | null }>();
const emit = defineEmits<{ "update:visible": [value: boolean] }>();

const { register } = useSessions();
const formRef = ref<FormInstance>();
const submitting = ref(false);

const form = reactive({ phone: "", nickname: "" });

const rules: FormRules = {
  phone: [
    { required: true, message: "请输入手机号", trigger: "blur" },
    { pattern: /^1\d{10}$/, message: "请输入有效的 11 位手机号", trigger: "blur" },
  ],
};

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      form.phone = "";
      form.nickname = "";
      formRef.value?.clearValidate();
    }
  },
);

function close() {
  emit("update:visible", false);
}

async function submit() {
  if (!props.session || !formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    const updated = await register(props.session.id, {
      phone: form.phone.trim(),
      nickname: form.nickname.trim() || undefined,
    });
    const mine = updated.registrations.find((item) => item.phone === form.phone.trim());
    if (mine?.status === "waitlist") {
      ElMessage.warning("本场已满员，你已进入候补队列，有人退出时将自动按序转正");
    } else {
      ElMessage.success("报名成功，拼车成功！");
    }
    close();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "报名失败");
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="报名拼车"
    width="420px"
    @close="close"
  >
    <div v-if="session" class="register-dialog-body">
      <p class="register-meta">
        {{ session.game }} · {{ session.date }} {{ session.timeSlot }} ·
        上限 {{ session.capacity }} 人
      </p>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="手机号" prop="phone">
          <el-input
            v-model="form.phone"
            maxlength="11"
            placeholder="用于登记和退出报名，同一场只占一个位置"
          />
        </el-form-item>
        <el-form-item label="昵称（选填）">
          <el-input v-model="form.nickname" maxlength="20" placeholder="不填则展示脱敏手机号" />
        </el-form-item>
      </el-form>
      <p v-if="session.full" class="register-tip">
        当前已满员，提交后将进入候补队列；有人退出时队首自动转正。
      </p>
    </div>
    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">提交报名</el-button>
    </template>
  </el-dialog>
</template>
