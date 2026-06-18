<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { clearSession, isSessionExpired, markActivity } from './auth/session';
import AppShell from './components/AppShell.vue';

const route = useRoute();
const router = useRouter();
const isPublic = computed(() => Boolean(route.meta.public));
let sessionTimer: number | undefined;
const activityEvents = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];

function handleActivity() {
  markActivity();
}

function checkSession() {
  if (isSessionExpired()) {
    clearSession();
    router.push('/login');
  }
}

onMounted(() => {
  activityEvents.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }));
  sessionTimer = window.setInterval(checkSession, 60 * 1000);
});

onBeforeUnmount(() => {
  activityEvents.forEach((event) => window.removeEventListener(event, handleActivity));
  if (sessionTimer) {
    window.clearInterval(sessionTimer);
  }
});
</script>

<template>
  <RouterView v-if="isPublic" />
  <AppShell v-else>
    <RouterView />
  </AppShell>
</template>
