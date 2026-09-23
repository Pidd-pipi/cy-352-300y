<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { APP_CODE, APP_NAME } from "./constants/app";
import OverviewView from "./views/OverviewView.vue";
import SessionsView from "./views/SessionsView.vue";

const tabs = [
  { key: "overview", label: "运营总览", hash: "#/" },
  { key: "sessions", label: "组局报名", hash: "#/sessions" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

function readHash(): TabKey {
  return window.location.hash === "#/sessions" ? "sessions" : "overview";
}

const activeTab = ref<TabKey>(readHash());

function onHashChange() {
  activeTab.value = readHash();
}

function switchTab(key: TabKey) {
  const target = tabs.find((tab) => tab.key === key);
  if (target) {
    window.location.hash = target.hash.slice(1);
  }
}

onMounted(() => window.addEventListener("hashchange", onHashChange));
onBeforeUnmount(() => window.removeEventListener("hashchange", onHashChange));

const currentLabel = computed(() => tabs.find((tab) => tab.key === activeTab.value)?.label);
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <div>
        <span class="brand-code">{{ APP_CODE }}</span>
        <h1 class="brand-title">{{ APP_NAME }}</h1>
      </div>
      <el-radio-group :model-value="activeTab" size="large" @change="switchTab">
        <el-radio-button
          v-for="tab in tabs"
          :key="tab.key"
          :value="tab.key"
        >
          {{ tab.label }}
        </el-radio-button>
      </el-radio-group>
    </header>
    <component :is="activeTab === 'sessions' ? SessionsView : OverviewView" />
    <footer class="app-footer">
      <span>当前页面：{{ currentLabel }}</span>
      <span>lpboardgame · 桌游吧社交平台</span>
    </footer>
  </main>
</template>
