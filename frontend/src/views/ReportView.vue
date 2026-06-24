<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { http } from '../api/http';
import { t } from '../i18n';

type CountMap = Record<string, number>;
type ReportSnapshot = {
  generatedAt: string;
  projectHealth: {
    total: number;
    active: number;
    completed: number;
    attention: number;
    completionRate: number;
    averageProgress: number;
    byStatus: CountMap;
    byType: CountMap;
  };
  taskHealth: {
    total: number;
    overdue: number;
    dueSoon: number;
    done: number;
    recurring: number;
    byStatus: CountMap;
  };
  crm: {
    total: number;
    byStage: CountMap;
    followUpStatus: CountMap;
    pendingFollowUps: number;
    cooperated: number;
    upcomingFollowUps: Array<{ id: string; name: string; stage: string; followUpStatus: string; nextFollowUpDate?: string }>;
  };
  knowledge: {
    articles: number;
    withAttachments: number;
  };
  overdueTasks: Array<{ id: string; title: string; projectName?: string; dueDate?: string; priority: string }>;
  dueSoonTasks: Array<{ id: string; title: string; projectName?: string; dueDate?: string; priority: string }>;
  customerProjects: Array<{ id: string; name: string; customerName?: string; status: string; progress: number }>;
};

const router = useRouter();
const loading = ref(false);
const snapshot = ref<ReportSnapshot | null>(null);

const completionRate = computed(() => snapshot.value?.projectHealth.completionRate || 0);

function statusLabel(status: string) {
  return t(`status.${status}`);
}

function projectTypeLabel(type: string) {
  return t(`project.type.${type}`);
}

function taskStatusLabel(status: string) {
  return t(`status.${status}`);
}

function crmStageLabel(stage: string) {
  return t(`crm.stage.${stage}`);
}

function followUpStatusLabel(status: string) {
  return t(`crm.followUpStatus.${status}`);
}

function countRows(map?: CountMap, labeler: (key: string) => string = (key) => key) {
  return Object.entries(map || {}).map(([key, value]) => ({ key, label: labeler(key), value }));
}

function openTask(row: { id: string }) {
  router.push(`/task?taskId=${row.id}`);
}

function openProject(row: { id: string }) {
  router.push(`/project?projectId=${row.id}`);
}

async function loadReport() {
  loading.value = true;
  try {
    const { data } = await http.get<ReportSnapshot>('/reports/operations');
    snapshot.value = data;
  } finally {
    loading.value = false;
  }
}

async function generateReport() {
  loading.value = true;
  try {
    await http.post('/reports/operations');
    await loadReport();
    ElMessage.success(t('report.generateSuccess'));
  } finally {
    loading.value = false;
  }
}

onMounted(loadReport);
</script>

<template>
  <div v-loading="loading">
    <header class="page-header">
      <div>
        <h1>{{ t('report.title') }}</h1>
        <p>{{ t('report.subtitle') }}</p>
      </div>
      <el-button type="primary" @click="generateReport">{{ t('report.generate') }}</el-button>
    </header>

    <template v-if="snapshot">
      <section class="metric-grid">
        <div class="metric-card"><span>{{ t('dashboard.projectTotal') }}</span><strong>{{ snapshot.projectHealth.total }}</strong></div>
        <div class="metric-card"><span>{{ t('dashboard.taskTotal') }}</span><strong>{{ snapshot.taskHealth.total }}</strong></div>
        <div class="metric-card"><span>{{ t('dashboard.customerCount') }}</span><strong>{{ snapshot.crm.total }}</strong></div>
        <div class="metric-card"><span>{{ t('dashboard.knowledgeArticles') }}</span><strong>{{ snapshot.knowledge.articles }}</strong></div>
      </section>

      <section class="split-grid">
        <div class="work-panel">
          <h2>{{ t('report.projectHealth') }}</h2>
          <el-progress :percentage="completionRate" :stroke-width="14" />
          <el-divider />
          <el-descriptions :column="1" border>
            <el-descriptions-item :label="t('report.active')">{{ snapshot.projectHealth.active }} {{ t('nav.project') }}</el-descriptions-item>
            <el-descriptions-item :label="t('report.attention')">{{ snapshot.projectHealth.attention }} {{ t('nav.project') }}</el-descriptions-item>
            <el-descriptions-item :label="t('report.completion')">{{ completionRate }}%</el-descriptions-item>
            <el-descriptions-item :label="t('report.averageProgress')">{{ snapshot.projectHealth.averageProgress }}%</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="work-panel">
          <h2>{{ t('report.taskHealth') }}</h2>
          <el-descriptions :column="1" border>
            <el-descriptions-item :label="t('dashboard.overdueTasks')">{{ snapshot.taskHealth.overdue }}</el-descriptions-item>
            <el-descriptions-item :label="t('report.dueSoon')">{{ snapshot.taskHealth.dueSoon }}</el-descriptions-item>
            <el-descriptions-item :label="t('status.done')">{{ snapshot.taskHealth.done }}</el-descriptions-item>
            <el-descriptions-item :label="t('task.recurrence')">{{ snapshot.taskHealth.recurring }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </section>

      <section class="split-grid">
        <div class="work-panel">
          <h2>{{ t('report.projectByType') }}</h2>
          <el-table :data="countRows(snapshot.projectHealth.byType, projectTypeLabel)" size="small">
            <el-table-column prop="label" :label="t('project.type')" />
            <el-table-column prop="value" :label="t('form.fields')" width="100" />
          </el-table>
        </div>

        <div class="work-panel">
          <h2>{{ t('report.crmFunnel') }}</h2>
          <el-table :data="countRows(snapshot.crm.byStage, crmStageLabel)" size="small">
            <el-table-column prop="label" :label="t('crm.stage')" />
            <el-table-column prop="value" :label="t('form.fields')" width="100" />
          </el-table>
        </div>
      </section>

      <section class="split-grid">
        <div class="work-panel">
          <h2>{{ t('report.taskByStatus') }}</h2>
          <el-table :data="countRows(snapshot.taskHealth.byStatus, taskStatusLabel)" size="small">
            <el-table-column prop="label" :label="t('common.status')" />
            <el-table-column prop="value" :label="t('form.fields')" width="100" />
          </el-table>
        </div>

        <div class="work-panel">
          <h2>{{ t('report.followUpStatus') }}</h2>
          <el-table :data="countRows(snapshot.crm.followUpStatus, followUpStatusLabel)" size="small">
            <el-table-column prop="label" :label="t('crm.followUpStatus')" />
            <el-table-column prop="value" :label="t('form.fields')" width="100" />
          </el-table>
        </div>
      </section>

      <section class="split-grid">
        <div class="work-panel">
          <h2>{{ t('report.overdueTasks') }}</h2>
          <el-table :data="snapshot.overdueTasks" empty-text="-" @row-click="openTask">
            <el-table-column prop="title" :label="t('task.name')" min-width="180" />
            <el-table-column prop="projectName" :label="t('task.project')" min-width="140" />
            <el-table-column prop="dueDate" :label="t('task.dueDate')" width="120" />
          </el-table>
        </div>

        <div class="work-panel">
          <h2>{{ t('report.customerProjects') }}</h2>
          <el-table :data="snapshot.customerProjects" empty-text="-" @row-click="openProject">
            <el-table-column prop="name" :label="t('project.name')" min-width="160" />
            <el-table-column prop="customerName" :label="t('crm.customerName')" min-width="140" />
            <el-table-column :label="t('common.status')" width="110">
              <template #default="{ row }">{{ statusLabel(row.status) }}</template>
            </el-table-column>
            <el-table-column :label="t('common.progress')" width="130">
              <template #default="{ row }"><el-progress :percentage="row.progress || 0" /></template>
            </el-table-column>
          </el-table>
        </div>
      </section>

      <section class="work-panel">
        <h2>{{ t('report.upcomingFollowUps') }}</h2>
        <el-table :data="snapshot.crm.upcomingFollowUps" empty-text="-" @row-click="() => router.push('/crm')">
          <el-table-column prop="name" :label="t('crm.customerName')" min-width="180" />
          <el-table-column :label="t('crm.stage')" width="120">
            <template #default="{ row }">{{ crmStageLabel(row.stage) }}</template>
          </el-table-column>
          <el-table-column :label="t('crm.followUpStatus')" width="130">
            <template #default="{ row }">{{ followUpStatusLabel(row.followUpStatus) }}</template>
          </el-table-column>
          <el-table-column prop="nextFollowUpDate" :label="t('crm.nextFollowUpDate')" width="150" />
        </el-table>
      </section>
    </template>
  </div>
</template>
