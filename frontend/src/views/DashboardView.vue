<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { http } from '../api/http';
import { t } from '../i18n';

type RecentProject = {
  id: string;
  name: string;
  status: string;
  type: string;
  cropType?: string;
  progress: number;
};
type RiskAlert = {
  level: 'danger' | 'warning' | 'info';
  title: string;
  content: string;
  relatedType?: string;
  relatedId?: string;
};
type DueTask = {
  id: string;
  title: string;
  dueDate?: string;
  projectName?: string;
  priority: string;
};
type FollowUp = {
  id: string;
  name: string;
  stage: string;
  followUpStatus: string;
  nextFollowUpDate?: string;
};
type DashboardData = {
  projects: number;
  activeProjects: number;
  tasks: number;
  overdueTasks: number;
  customers: number;
  knowledgeArticles: number;
  recentProjects: RecentProject[];
  riskAlerts: RiskAlert[];
  dueTasks: DueTask[];
  upcomingFollowUps: FollowUp[];
};

const router = useRouter();
const loading = ref(false);
const metrics = ref<DashboardData>({
  projects: 0,
  activeProjects: 0,
  tasks: 0,
  overdueTasks: 0,
  customers: 0,
  knowledgeArticles: 0,
  recentProjects: [],
  riskAlerts: [],
  dueTasks: [],
  upcomingFollowUps: [],
});

function statusLabel(status?: string) {
  return t(`status.${status || 'planning'}`);
}

function priorityLabel(priority?: string) {
  return t(`priority.${priority || 'medium'}`);
}

function projectTypeLabel(type?: string) {
  return t(`project.type.${type || 'trial'}`);
}

function crmStageLabel(stage?: string) {
  return t(`crm.stage.${stage || 'lead'}`);
}

function followUpStatusLabel(status?: string) {
  return t(`crm.followUpStatus.${status || 'pending'}`);
}

function openRelated(alert: RiskAlert) {
  if (alert.relatedType === 'project' && alert.relatedId) router.push(`/project?projectId=${alert.relatedId}`);
  if (alert.relatedType === 'task' && alert.relatedId) router.push(`/task?taskId=${alert.relatedId}`);
  if (alert.relatedType === 'crm') router.push('/crm');
}

async function loadDashboard() {
  loading.value = true;
  try {
    const { data } = await http.get<DashboardData>('/reports/dashboard');
    metrics.value = {
      projects: data.projects || 0,
      activeProjects: data.activeProjects || 0,
      tasks: data.tasks || 0,
      overdueTasks: data.overdueTasks || 0,
      customers: data.customers || 0,
      knowledgeArticles: data.knowledgeArticles || 0,
      recentProjects: data.recentProjects || [],
      riskAlerts: data.riskAlerts || [],
      dueTasks: data.dueTasks || [],
      upcomingFollowUps: data.upcomingFollowUps || [],
    };
  } finally {
    loading.value = false;
  }
}

onMounted(loadDashboard);
</script>

<template>
  <div v-loading="loading">
    <header class="page-header">
      <div>
        <h1>{{ t('dashboard.title') }}</h1>
        <p>{{ t('dashboard.subtitle') }}</p>
      </div>
      <el-button type="primary" @click="router.push('/project')">{{ t('dashboard.newProject') }}</el-button>
    </header>

    <section class="metric-grid">
      <button class="metric-card metric-card-button" @click="router.push('/project')"><span>{{ t('dashboard.projectTotal') }}</span><strong>{{ metrics.projects }}</strong></button>
      <button class="metric-card metric-card-button" @click="router.push('/project')"><span>{{ t('dashboard.activeProjects') }}</span><strong>{{ metrics.activeProjects }}</strong></button>
      <button class="metric-card metric-card-button" @click="router.push('/task')"><span>{{ t('dashboard.taskTotal') }}</span><strong>{{ metrics.tasks }}</strong></button>
      <button class="metric-card metric-card-button" @click="router.push('/task')"><span>{{ t('dashboard.overdueTasks') }}</span><strong>{{ metrics.overdueTasks }}</strong></button>
      <button class="metric-card metric-card-button" @click="router.push('/crm')"><span>{{ t('dashboard.customerCount') }}</span><strong>{{ metrics.customers }}</strong></button>
      <button class="metric-card metric-card-button" @click="router.push('/knowledge')"><span>{{ t('dashboard.knowledgeArticles') }}</span><strong>{{ metrics.knowledgeArticles }}</strong></button>
    </section>

    <section class="split-grid">
      <div class="work-panel">
        <h2>{{ t('dashboard.recentProjects') }}</h2>
        <el-table :data="metrics.recentProjects" empty-text="-" @row-click="(row: RecentProject) => router.push(`/project?projectId=${row.id}`)">
          <el-table-column prop="name" :label="t('nav.project')" min-width="180" />
          <el-table-column :label="t('project.type')" width="120">
            <template #default="{ row }">{{ projectTypeLabel(row.type) }}</template>
          </el-table-column>
          <el-table-column :label="t('common.status')" width="110">
            <template #default="{ row }">{{ statusLabel(row.status) }}</template>
          </el-table-column>
          <el-table-column :label="t('common.progress')" width="140">
            <template #default="{ row }"><el-progress :percentage="row.progress || 0" /></template>
          </el-table-column>
        </el-table>
      </div>

      <div class="work-panel">
        <h2>{{ t('dashboard.riskAlerts') }}</h2>
        <el-timeline v-if="metrics.riskAlerts.length">
          <el-timeline-item v-for="alert in metrics.riskAlerts" :key="`${alert.title}-${alert.relatedId}`" :type="alert.level" :timestamp="alert.title">
            <button class="link-button" @click="openRelated(alert)">{{ alert.content }}</button>
          </el-timeline-item>
        </el-timeline>
        <el-empty v-else :description="t('dashboard.noRisks')" />
      </div>
    </section>

    <section class="split-grid">
      <div class="work-panel">
        <h2>{{ t('dashboard.overdueTaskList') }}</h2>
        <el-table :data="metrics.dueTasks" empty-text="-" @row-click="(row: DueTask) => router.push(`/task?taskId=${row.id}`)">
          <el-table-column prop="title" :label="t('task.name')" min-width="180" />
          <el-table-column prop="projectName" :label="t('task.project')" min-width="150" />
          <el-table-column :label="t('task.priority')" width="100">
            <template #default="{ row }">{{ priorityLabel(row.priority) }}</template>
          </el-table-column>
          <el-table-column prop="dueDate" :label="t('task.dueDate')" width="120" />
        </el-table>
      </div>

      <div class="work-panel">
        <h2>{{ t('dashboard.followUps') }}</h2>
        <el-table :data="metrics.upcomingFollowUps" empty-text="-" @row-click="() => router.push('/crm')">
          <el-table-column prop="name" :label="t('crm.customerName')" min-width="180" />
          <el-table-column :label="t('crm.stage')" width="120">
            <template #default="{ row }">{{ crmStageLabel(row.stage) }}</template>
          </el-table-column>
          <el-table-column :label="t('crm.followUpStatus')" width="120">
            <template #default="{ row }">{{ followUpStatusLabel(row.followUpStatus) }}</template>
          </el-table-column>
          <el-table-column prop="nextFollowUpDate" :label="t('crm.nextFollowUpDate')" width="140" />
        </el-table>
      </div>
    </section>
  </div>
</template>
