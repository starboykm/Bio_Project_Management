<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { http } from '../api/http';
import { t } from '../i18n';

const router = useRouter();
const metrics = ref({
  projects: 0,
  activeProjects: 0,
  tasks: 0,
  overdueTasks: 0,
  customers: 0,
  knowledgeArticles: 0,
});

const recentProjects = [
  { name: '玉米示范田菌肥试验', statusKey: 'status.active', crop: '玉米', owner: '技术部' },
  { name: '华东经销商田间反馈', statusKey: 'status.planning', crop: '水稻', owner: '销售部' },
  { name: '新批次菌剂稳定性观察', statusKey: 'status.review', crop: '通用', owner: '研发部' },
];

onMounted(async () => {
  try {
    const { data } = await http.get('/reports/dashboard');
    metrics.value = data;
  } catch {
    metrics.value = {
      projects: 8,
      activeProjects: 5,
      tasks: 34,
      overdueTasks: 3,
      customers: 16,
      knowledgeArticles: 42,
    };
  }
});
</script>

<template>
  <div>
    <header class="page-header">
      <div>
        <h1>{{ t('dashboard.title') }}</h1>
        <p>{{ t('dashboard.subtitle') }}</p>
      </div>
      <el-button type="primary" @click="router.push('/project')">{{ t('dashboard.newProject') }}</el-button>
    </header>

    <section class="metric-grid">
      <div class="metric-card"><span>{{ t('dashboard.projectTotal') }}</span><strong>{{ metrics.projects }}</strong></div>
      <div class="metric-card"><span>{{ t('dashboard.activeProjects') }}</span><strong>{{ metrics.activeProjects }}</strong></div>
      <div class="metric-card"><span>{{ t('dashboard.taskTotal') }}</span><strong>{{ metrics.tasks }}</strong></div>
      <div class="metric-card"><span>{{ t('dashboard.overdueTasks') }}</span><strong>{{ metrics.overdueTasks }}</strong></div>
      <div class="metric-card"><span>{{ t('dashboard.customerCount') }}</span><strong>{{ metrics.customers }}</strong></div>
      <div class="metric-card"><span>{{ t('dashboard.knowledgeArticles') }}</span><strong>{{ metrics.knowledgeArticles }}</strong></div>
    </section>

    <section class="split-grid">
      <div class="work-panel">
        <h2>{{ t('dashboard.recentProjects') }}</h2>
        <el-table :data="recentProjects">
          <el-table-column prop="name" :label="t('nav.project')" />
          <el-table-column :label="t('common.status')" width="110">
            <template #default="{ row }">{{ t(row.statusKey) }}</template>
          </el-table-column>
          <el-table-column prop="crop" :label="t('dashboard.crop')" width="110" />
          <el-table-column prop="owner" :label="t('common.owner')" width="120" />
        </el-table>
      </div>
      <div class="work-panel">
        <h2>{{ t('dashboard.riskAlerts') }}</h2>
        <el-timeline>
          <el-timeline-item :timestamp="t('dashboard.today')">{{ t('dashboard.riskDue') }}</el-timeline-item>
          <el-timeline-item :timestamp="t('dashboard.thisWeek')">{{ t('dashboard.riskCustomer') }}</el-timeline-item>
          <el-timeline-item :timestamp="t('dashboard.thisMonth')">{{ t('dashboard.riskQuality') }}</el-timeline-item>
        </el-timeline>
      </div>
    </section>
  </div>
</template>
