<script setup lang="ts">
import { Lock, Mail } from '@lucide/vue';
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { http } from '../api/http';
import { markActivity } from '../auth/session';
import { setLocalLanguage, t } from '../i18n';

const router = useRouter();
const loading = ref(false);
const form = reactive({
  email: 'admin@bio.local',
  password: 'Admin123456',
});

async function login() {
  loading.value = true;
  try {
    const { data } = await http.post('/auth/login', form);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('currentUser', JSON.stringify(data.user));
    setLocalLanguage(data.user.language || 'zh');
    markActivity();
    router.push('/dashboard');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-visual">
      <h1>{{ t('login.title') }}</h1>
      <p>{{ t('login.subtitle') }}</p>
    </section>
    <section class="login-panel">
      <h2>{{ t('login.accountLogin') }}</h2>
      <el-form :model="form" label-position="top" @keyup.enter="login">
        <el-form-item :label="t('common.email')">
          <el-input v-model="form.email" size="large">
            <template #prefix><Mail :size="17" /></template>
          </el-input>
        </el-form-item>
        <el-form-item :label="t('common.password')">
          <el-input v-model="form.password" type="password" size="large" show-password>
            <template #prefix><Lock :size="17" /></template>
          </el-input>
        </el-form-item>
        <el-button type="primary" size="large" :loading="loading" style="width: 100%" @click="login">
          {{ t('login.submit') }}
        </el-button>
      </el-form>
    </section>
  </main>
</template>
