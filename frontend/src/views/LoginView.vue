<script setup lang="ts">
import { Lock, Mail } from '@lucide/vue';
import { ElMessage } from 'element-plus';
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { http } from '../api/http';
import { markActivity } from '../auth/session';
import { setLocalLanguage, t } from '../i18n';

const router = useRouter();
const loading = ref(false);
const errorMessage = ref('');
const form = reactive({
  email: 'admin@bio.local',
  password: 'Admin123456',
});

function getLoginErrorMessage(error: unknown) {
  const response = (error as { response?: { data?: { message?: string | string[] }; status?: number } }).response;
  const message = response?.data?.message;
  if (Array.isArray(message)) {
    return message.join('；');
  }
  if (message) {
    return message;
  }
  if (response?.status === 401) {
    return '账号或密码不正确，请检查后重试。';
  }
  return '登录失败，请稍后重试或联系管理员。';
}

async function login() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const { data } = await http.post('/auth/login', form);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('currentUser', JSON.stringify(data.user));
    setLocalLanguage(data.user.language || 'zh');
    markActivity();
    router.push('/dashboard');
  } catch (error) {
    errorMessage.value = getLoginErrorMessage(error);
    ElMessage.error(errorMessage.value);
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
        <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" />
        <el-button type="primary" size="large" :loading="loading" style="width: 100%" @click="login">
          {{ t('login.submit') }}
        </el-button>
      </el-form>
    </section>
  </main>
</template>
