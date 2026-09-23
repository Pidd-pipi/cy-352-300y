<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { routes, type AppPath } from "./routes";
import { APP_CODE, APP_NAME } from "./constants/app";
import OverviewView from "./views/OverviewView.vue";
import SessionsView from "./views/SessionsView.vue";

function initialPath(): AppPath {
  const hash = window.location.hash.replace(/^#/, "");
  return routes.some((route) => route.path === hash) ? (hash as AppPath) : "/";
}

const currentPath = ref<AppPath>(initialPath());

watch(currentPath, (path) => {
  window.location.hash = path;
});

window.addEventListener("hashchange", () => {
  const hash = window.location.hash.replace(/^#/, "");
  if (routes.some((route) => route.path === hash)) {
    currentPath.value = hash as AppPath;
  }
});

const currentLabel = computed(
  () => routes.find((route) => route.path === currentPath.value)?.label ?? "",
);
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <div>
        <span class="brand-code">{{ APP_CODE }}</span>
        <h1 class="brand-title">{{ APP_NAME }}</h1>
      </div>
      <nav class="topnav">
        <a
          v-for="route in routes"
          :key="route.path"
          :href="`#${route.path}`"
          class="nav-link"
          :class="{ active: route.path === currentPath }"
          @click.prevent="currentPath = route.path"
        >
          {{ route.label }}
        </a>
      </nav>
    </header>

    <div class="page-crumb">当前位置：{{ currentLabel }}</div>

    <OverviewView v-if="currentPath === '/'" />
    <SessionsView v-else-if="currentPath === '/sessions'" />
  </main>
</template>
