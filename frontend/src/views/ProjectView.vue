<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { http } from '../api/http';
import MentionInput from '../components/MentionInput.vue';
import { t } from '../i18n';

type UserOption = { id: string; name: string; email: string };
type CustomerOption = { id: string; name: string };
type MentionOption = { id: string; name: string; label: string; email?: string };
type ProjectComment = {
  id: string;
  type: string;
  content: string;
  authorId: string;
  createdAt: string;
};
type Project = {
  id?: string;
  name: string;
  status: string;
  type?: string;
  cropType?: string;
  trialField?: string;
  microbialBatch?: string;
  fertilizationPlan?: string;
  objective?: string;
  customerId?: string;
  contractName?: string;
  contractPath?: string;
  ownerId?: string;
  participantIds?: string[];
  progress?: number;
  latestUpdate?: string;
  resultSummary?: string;
  reportContent?: string;
  comments?: ProjectComment[];
};
type Task = {
  id?: string;
  title: string;
  description?: string;
  projectId?: string;
  assigneeId?: string;
  status: string;
  priority: string;
  progress: number;
  progressNote?: string;
  dueDate?: string;
  recurrenceType?: string;
  recurrenceInterval?: number;
  recurrenceTime?: string;
  recurrenceDayOfWeek?: number;
  recurrenceDayOfMonth?: number;
  recurrenceCron?: string;
};

const projects = ref<Project[]>([]);
const users = ref<UserOption[]>([]);
const customers = ref<CustomerOption[]>([]);
const mentionOptions = ref<MentionOption[]>([]);
const projectTasks = ref<Task[]>([]);
const selectedId = ref<string>();
const selected = ref<Project | null>(null);
const projectDialogVisible = ref(false);
const editingProjectId = ref<string | undefined>();
const taskDialogVisible = ref(false);
const editingTask = ref<Task | null>(null);
const commentContent = ref('');
const commentType = ref('comment');
const route = useRoute();

const projectForm = reactive<Project>({
  name: '',
  status: 'planning',
  type: 'trial',
  cropType: '',
  trialField: '',
  microbialBatch: '',
  fertilizationPlan: '',
  objective: '',
  customerId: '',
  contractName: '',
  contractPath: '',
  ownerId: '',
  participantIds: [],
});

const taskForm = reactive<Task>({
  title: '',
  description: '',
  projectId: '',
  assigneeId: '',
  status: 'todo',
  priority: 'medium',
  progress: 0,
  progressNote: '',
  dueDate: '',
  recurrenceType: 'none',
  recurrenceInterval: 1,
  recurrenceTime: '',
  recurrenceDayOfWeek: 1,
  recurrenceDayOfMonth: 1,
  recurrenceCron: '',
});

const ownerName = computed(() => users.value.find((user) => user.id === selected.value?.ownerId)?.name || '-');
const projectDialogTitle = computed(() => (editingProjectId.value ? t('project.edit') : t('project.new')));
const taskDialogTitle = computed(() => (editingTask.value ? t('task.edit') : t('task.new')));

const projectTypes = computed(() => [
  { label: t('project.type.trial'), value: 'trial' },
  { label: t('project.type.customer'), value: 'customer' },
  { label: t('project.type.internal'), value: 'internal' },
]);

const recurrenceTypes = computed(() => [
  { label: t('task.recurrence.none'), value: 'none' },
  { label: t('task.recurrence.daily'), value: 'daily' },
  { label: t('task.recurrence.weekly'), value: 'weekly' },
  { label: t('task.recurrence.monthly'), value: 'monthly' },
  { label: t('task.recurrence.custom'), value: 'custom' },
]);

const weekDays = computed(() => [
  { label: t('task.weekday.1'), value: 1 },
  { label: t('task.weekday.2'), value: 2 },
  { label: t('task.weekday.3'), value: 3 },
  { label: t('task.weekday.4'), value: 4 },
  { label: t('task.weekday.5'), value: 5 },
  { label: t('task.weekday.6'), value: 6 },
  { label: t('task.weekday.7'), value: 7 },
]);

function userName(id?: string) {
  return users.value.find((user) => user.id === id)?.name || '-';
}

function customerName(id?: string) {
  return customers.value.find((customer) => customer.id === id)?.name || '-';
}

function projectTypeLabel(type?: string) {
  return t(`project.type.${type || 'trial'}`);
}

function recurrenceLabel(task: Task) {
  if (!task.recurrenceType || task.recurrenceType === 'none') return t('task.recurrence.none');
  return t(`task.recurrence.${task.recurrenceType}`);
}

function apiErrorMessage(error: unknown) {
  const response = (error as { response?: { data?: { message?: string | string[] } } }).response;
  const message = response?.data?.message;
  if (Array.isArray(message)) return message.join('；');
  return message || t('common.saveFailed');
}

function compactPayload<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== '' && value !== undefined && value !== null));
}

function projectPayload() {
  return compactPayload({
    name: projectForm.name,
    status: projectForm.status,
    type: projectForm.type,
    cropType: projectForm.cropType,
    trialField: projectForm.trialField,
    microbialBatch: projectForm.microbialBatch,
    fertilizationPlan: projectForm.fertilizationPlan,
    objective: projectForm.objective,
    customerId: projectForm.type === 'customer' ? projectForm.customerId : undefined,
    contractName: projectForm.type === 'customer' ? projectForm.contractName : undefined,
    contractPath: projectForm.type === 'customer' ? projectForm.contractPath : undefined,
    ownerId: projectForm.ownerId,
    participantIds: projectForm.participantIds || [],
  });
}

function taskPayload() {
  const payload = {
    title: taskForm.title,
    description: taskForm.description,
    projectId: selected.value?.id || taskForm.projectId,
    assigneeId: taskForm.assigneeId,
    status: taskForm.status,
    priority: taskForm.priority,
    progress: taskForm.status === 'done' ? 100 : taskForm.progress,
    progressNote: taskForm.progressNote,
    dueDate: taskForm.dueDate,
    recurrenceType: taskForm.recurrenceType || 'none',
    recurrenceInterval: taskForm.recurrenceType && taskForm.recurrenceType !== 'none' ? taskForm.recurrenceInterval || 1 : undefined,
    recurrenceTime: taskForm.recurrenceTime,
    recurrenceDayOfWeek: taskForm.recurrenceType === 'weekly' ? taskForm.recurrenceDayOfWeek : undefined,
    recurrenceDayOfMonth: taskForm.recurrenceType === 'monthly' ? taskForm.recurrenceDayOfMonth : undefined,
    recurrenceCron: taskForm.recurrenceType === 'custom' ? taskForm.recurrenceCron : undefined,
  };
  return compactPayload(payload);
}

function validateProjectForm() {
  if (!projectForm.name.trim()) {
    ElMessage.error(t('project.validation.name'));
    return false;
  }
  if (!projectForm.ownerId) {
    ElMessage.error(t('project.validation.owner'));
    return false;
  }
  if (projectForm.type === 'trial' && (!projectForm.cropType?.trim() || !projectForm.trialField?.trim())) {
    ElMessage.error(t('project.validation.trial'));
    return false;
  }
  if (projectForm.type === 'customer' && !projectForm.customerId) {
    ElMessage.error(t('project.validation.customer'));
    return false;
  }
  if (projectForm.type === 'internal' && !projectForm.objective?.trim()) {
    ElMessage.error(t('project.validation.objective'));
    return false;
  }
  return true;
}

function validateTaskForm() {
  if (!taskForm.title.trim()) {
    ElMessage.error(t('task.validation.title'));
    return false;
  }
  if (taskForm.recurrenceType === 'custom' && !taskForm.recurrenceCron?.trim()) {
    ElMessage.error(t('task.validation.cron'));
    return false;
  }
  return true;
}

async function confirmDelete(message: string) {
  try {
    await ElMessageBox.confirm(message, t('common.confirm'), { type: 'warning' });
    return true;
  } catch {
    return false;
  }
}

async function loadUsers() {
  const { data } = await http.get('/users');
  users.value = data;
}

async function loadCustomers() {
  const { data } = await http.get('/crm/customers');
  customers.value = data;
}

async function loadMentionOptions() {
  const { data } = await http.get('/communications/mentions');
  mentionOptions.value = data;
}

async function loadProjects() {
  const { data } = await http.get('/projects');
  projects.value = data;
  const queryProjectId = typeof route.query.projectId === 'string' ? route.query.projectId : undefined;
  if (queryProjectId && projects.value.some((project) => project.id === queryProjectId)) {
    selectedId.value = queryProjectId;
  }
  if (!projects.value.some((project) => project.id === selectedId.value)) {
    selectedId.value = projects.value[0]?.id;
  }
  if (selectedId.value) {
    await loadProject(selectedId.value);
  } else {
    selected.value = null;
    projectTasks.value = [];
  }
}

async function loadProject(id: string) {
  selectedId.value = id;
  const { data } = await http.get(`/projects/${id}`);
  selected.value = data;
  await loadProjectTasks(id);
}

async function loadProjectTasks(projectId: string) {
  const { data } = await http.get('/tasks', { params: { projectId, scope: 'all' } });
  projectTasks.value = data;
}

async function refreshSelectedProject() {
  if (selected.value?.id) {
    await loadProject(selected.value.id);
    const { data } = await http.get('/projects');
    projects.value = data;
  }
}

function selectProject(row: Project) {
  if (row.id) {
    loadProject(row.id);
  }
}

function openCreateProject() {
  editingProjectId.value = undefined;
  Object.assign(projectForm, {
    name: '',
    status: 'planning',
    type: 'trial',
    cropType: '',
    trialField: '',
    microbialBatch: '',
    fertilizationPlan: '',
    objective: '',
    customerId: '',
    contractName: '',
    contractPath: '',
    ownerId: users.value[0]?.id || '',
    participantIds: [],
  });
  projectDialogVisible.value = true;
}

function openEditProject() {
  if (!selected.value) return;
  editingProjectId.value = selected.value.id;
  Object.assign(projectForm, {
    name: selected.value.name,
    status: selected.value.status,
    type: selected.value.type || 'trial',
    cropType: selected.value.cropType || '',
    trialField: selected.value.trialField || '',
    microbialBatch: selected.value.microbialBatch || '',
    fertilizationPlan: selected.value.fertilizationPlan || '',
    objective: selected.value.objective || '',
    customerId: selected.value.customerId || '',
    contractName: selected.value.contractName || '',
    contractPath: selected.value.contractPath || '',
    ownerId: selected.value.ownerId || '',
    participantIds: selected.value.participantIds || [],
  });
  projectDialogVisible.value = true;
}

async function submitProject() {
  if (!validateProjectForm()) return;
  try {
    if (editingProjectId.value) {
      await http.patch(`/projects/${editingProjectId.value}`, projectPayload());
      selectedId.value = editingProjectId.value;
    } else {
      const { data } = await http.post('/projects', projectPayload());
      selectedId.value = data.id;
    }
    projectDialogVisible.value = false;
    await loadProjects();
    ElMessage.success(t('common.saveSuccess'));
  } catch (error) {
    ElMessage.error(apiErrorMessage(error));
  }
}

async function uploadContract(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const form = new FormData();
  form.append('file', file);
  try {
    const { data } = await http.post('/projects/contracts/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    projectForm.contractName = data.name;
    projectForm.contractPath = data.url;
    ElMessage.success(t('project.contractUploadSuccess'));
  } catch (error) {
    ElMessage.error(apiErrorMessage(error));
  } finally {
    input.value = '';
  }
}

async function deleteProject() {
  if (!selected.value?.id || !(await confirmDelete(t('common.confirmDelete')))) return;
  await http.delete(`/projects/${selected.value.id}`);
  projectDialogVisible.value = false;
  selectedId.value = undefined;
  selected.value = null;
  await loadProjects();
}

function resetTaskForm() {
  Object.assign(taskForm, {
    title: '',
    description: '',
    projectId: selected.value?.id || '',
    assigneeId: selected.value?.ownerId || users.value[0]?.id || '',
    status: 'todo',
    priority: 'medium',
    progress: 0,
    progressNote: '',
    dueDate: '',
    recurrenceType: 'none',
    recurrenceInterval: 1,
    recurrenceTime: '',
    recurrenceDayOfWeek: 1,
    recurrenceDayOfMonth: 1,
    recurrenceCron: '',
  });
}

function openCreateTask() {
  editingTask.value = null;
  resetTaskForm();
  taskDialogVisible.value = true;
}

function openEditTask(task: Task) {
  editingTask.value = task;
  Object.assign(taskForm, {
    ...task,
    projectId: selected.value?.id || task.projectId || '',
    dueDate: task.dueDate || '',
    recurrenceType: task.recurrenceType || 'none',
    recurrenceInterval: task.recurrenceInterval || 1,
    recurrenceTime: task.recurrenceTime || '',
    recurrenceDayOfWeek: task.recurrenceDayOfWeek || 1,
    recurrenceDayOfMonth: task.recurrenceDayOfMonth || 1,
    recurrenceCron: task.recurrenceCron || '',
  });
  taskDialogVisible.value = true;
}

async function saveTask() {
  if (!validateTaskForm()) return;
  try {
    if (editingTask.value?.id) {
      await http.patch(`/tasks/${editingTask.value.id}`, taskPayload());
    } else {
      await http.post('/tasks', taskPayload());
    }
    taskDialogVisible.value = false;
    await refreshSelectedProject();
    ElMessage.success(t('common.saveSuccess'));
  } catch (error) {
    ElMessage.error(apiErrorMessage(error));
  }
}

async function deleteTask(task: Task | null) {
  if (!task?.id || !(await confirmDelete(t('task.deleteConfirm')))) return;
  await http.delete(`/tasks/${task.id}`);
  taskDialogVisible.value = false;
  await refreshSelectedProject();
}

async function addComment() {
  if (!selected.value?.id || !commentContent.value.trim()) return;
  await http.post(`/projects/${selected.value.id}/comments`, {
    type: commentType.value,
    content: commentContent.value,
  });
  commentContent.value = '';
  await refreshSelectedProject();
}

onMounted(async () => {
  await Promise.all([loadUsers(), loadCustomers(), loadMentionOptions()]);
  await loadProjects();
});
</script>

<template>
  <div>
    <header class="page-header">
      <div>
        <h1>{{ t('project.title') }}</h1>
        <p>{{ t('project.subtitle') }}</p>
      </div>
      <el-button type="primary" @click="openCreateProject">{{ t('project.new') }}</el-button>
    </header>

    <section class="split-grid project-workspace">
      <div class="work-panel project-list-panel">
        <el-table :data="projects" highlight-current-row @row-click="selectProject">
          <el-table-column prop="name" :label="t('project.name')" min-width="180" />
          <el-table-column :label="t('project.type')" width="120">
            <template #default="{ row }">{{ projectTypeLabel(row.type) }}</template>
          </el-table-column>
          <el-table-column :label="t('common.progress')" width="130">
            <template #default="{ row }">
              <el-progress :percentage="row.progress || 0" />
            </template>
          </el-table-column>
          <el-table-column :label="t('common.status')" width="110">
            <template #default="{ row }">{{ t(`status.${row.status}`) }}</template>
          </el-table-column>
        </el-table>
      </div>

      <div class="work-panel project-detail-panel" v-if="selected">
        <div class="detail-header detail-header-clickable" :title="t('project.edit')" @click="openEditProject">
          <div>
            <h2>{{ selected.name }}</h2>
            <p>
              {{ t('project.type') }}: {{ projectTypeLabel(selected.type) }} · {{ t('common.owner') }}: {{ ownerName }}
              <template v-if="selected.type === 'trial'"> · {{ t('project.cropType') }}: {{ selected.cropType || '-' }}</template>
              <template v-if="selected.type === 'customer'"> · {{ t('project.customer') }}: {{ customerName(selected.customerId) }}</template>
            </p>
          </div>
          <el-progress type="dashboard" :percentage="selected.progress || 0" :width="86" />
        </div>

        <el-descriptions :column="2" border>
          <el-descriptions-item :label="t('project.type')">{{ projectTypeLabel(selected.type) }}</el-descriptions-item>
          <el-descriptions-item :label="t('common.status')">{{ t(`status.${selected.status}`) }}</el-descriptions-item>
          <el-descriptions-item :label="t('project.participants')">
            {{ (selected.participantIds || []).map(userName).join('、') || '-' }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('project.latestUpdate')">{{ selected.latestUpdate || '-' }}</el-descriptions-item>
          <template v-if="selected.type === 'trial'">
            <el-descriptions-item :label="t('project.cropType')">{{ selected.cropType || '-' }}</el-descriptions-item>
            <el-descriptions-item :label="t('project.trialField')">{{ selected.trialField || '-' }}</el-descriptions-item>
            <el-descriptions-item :label="t('project.microbialBatch')">{{ selected.microbialBatch || '-' }}</el-descriptions-item>
            <el-descriptions-item :label="t('project.fertilizationPlan')" :span="2">{{ selected.fertilizationPlan || '-' }}</el-descriptions-item>
          </template>
          <template v-else-if="selected.type === 'customer'">
            <el-descriptions-item :label="t('project.customer')">{{ customerName(selected.customerId) }}</el-descriptions-item>
            <el-descriptions-item :label="t('project.contract')">
              <a v-if="selected.contractPath" :href="selected.contractPath" target="_blank" rel="noreferrer">{{ selected.contractName || t('project.contract') }}</a>
              <span v-else>-</span>
            </el-descriptions-item>
            <el-descriptions-item :label="t('project.objective')" :span="2">{{ selected.objective || '-' }}</el-descriptions-item>
          </template>
          <template v-else>
            <el-descriptions-item :label="t('project.objective')" :span="2">{{ selected.objective || '-' }}</el-descriptions-item>
          </template>
          <el-descriptions-item :label="t('project.resultSummary')" :span="2">{{ selected.resultSummary || '-' }}</el-descriptions-item>
        </el-descriptions>

        <div class="section-title section-title-row">
          <span>{{ t('project.tasks') }}</span>
          <el-button size="small" type="primary" @click="openCreateTask">{{ t('task.new') }}</el-button>
        </div>
        <el-table :data="projectTasks" size="small" highlight-current-row @row-click="openEditTask">
          <el-table-column prop="title" :label="t('task.name')" min-width="180" />
          <el-table-column :label="t('common.assignee')" width="120">
            <template #default="{ row }">{{ userName(row.assigneeId) }}</template>
          </el-table-column>
          <el-table-column :label="t('common.status')" width="110">
            <template #default="{ row }">{{ t(`status.${row.status}`) }}</template>
          </el-table-column>
          <el-table-column :label="t('task.priority')" width="100">
            <template #default="{ row }">{{ t(`priority.${row.priority}`) }}</template>
          </el-table-column>
          <el-table-column :label="t('task.recurrence')" width="110">
            <template #default="{ row }">{{ recurrenceLabel(row) }}</template>
          </el-table-column>
          <el-table-column :label="t('common.progress')" width="150">
            <template #default="{ row }"><el-progress :percentage="row.progress || 0" /></template>
          </el-table-column>
        </el-table>

        <div class="section-title">{{ t('project.comments') }}</div>
        <div class="comment-editor">
          <el-select v-model="commentType" style="width: 130px">
            <el-option :label="t('project.commentType.comment')" value="comment" />
            <el-option :label="t('project.commentType.note')" value="note" />
            <el-option :label="t('project.commentType.progress')" value="progress" />
            <el-option :label="t('project.commentType.result')" value="result" />
            <el-option :label="t('project.commentType.report')" value="report" />
          </el-select>
          <MentionInput v-model="commentContent" :options="mentionOptions" :placeholder="t('project.commentPlaceholder')" />
          <el-button type="primary" @click="addComment">{{ t('common.submit') }}</el-button>
        </div>
        <div class="comment-list">
          <div v-for="comment in selected.comments" :key="comment.id" class="comment-item">
            <strong>{{ t(`project.commentType.${comment.type}`) }} · {{ userName(comment.authorId) }}</strong>
            <p>{{ comment.content }}</p>
            <span>{{ new Date(comment.createdAt).toLocaleString() }}</span>
          </div>
        </div>
      </div>
    </section>

    <el-dialog v-model="projectDialogVisible" :title="projectDialogTitle" width="620px">
      <el-form :model="projectForm" label-position="top">
        <el-form-item :label="t('project.name')" required><el-input v-model="projectForm.name" /></el-form-item>
        <el-form-item :label="t('project.type')" required>
          <el-select v-model="projectForm.type" style="width: 100%">
            <el-option v-for="type in projectTypes" :key="type.value" :label="type.label" :value="type.value" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('common.owner')" required>
          <el-select v-model="projectForm.ownerId" style="width: 100%">
            <el-option v-for="user in users" :key="user.id" :label="user.name" :value="user.id" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('project.participants')">
          <el-select v-model="projectForm.participantIds" multiple style="width: 100%">
            <el-option v-for="user in users" :key="user.id" :label="user.name" :value="user.id" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('common.status')">
          <el-select v-model="projectForm.status" style="width: 100%">
            <el-option :label="t('status.planning')" value="planning" />
            <el-option :label="t('status.active')" value="active" />
            <el-option :label="t('status.paused')" value="paused" />
            <el-option :label="t('status.completed')" value="completed" />
          </el-select>
        </el-form-item>
        <template v-if="projectForm.type === 'trial'">
          <el-form-item :label="t('project.cropType')" required><el-input v-model="projectForm.cropType" /></el-form-item>
          <el-form-item :label="t('project.trialField')" required><el-input v-model="projectForm.trialField" /></el-form-item>
          <el-form-item :label="t('project.microbialBatch')"><el-input v-model="projectForm.microbialBatch" /></el-form-item>
          <el-form-item :label="t('project.fertilizationPlan')"><el-input v-model="projectForm.fertilizationPlan" type="textarea" /></el-form-item>
        </template>
        <template v-else-if="projectForm.type === 'customer'">
          <el-form-item :label="t('project.customer')" required>
            <el-select v-model="projectForm.customerId" filterable style="width: 100%">
              <el-option v-for="customer in customers" :key="customer.id" :label="customer.name" :value="customer.id" />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('project.objective')"><el-input v-model="projectForm.objective" type="textarea" /></el-form-item>
          <el-form-item :label="t('project.contract')">
            <div class="upload-row">
              <label class="upload-button">
                {{ t('project.uploadContract') }}
                <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" @change="uploadContract" />
              </label>
              <a v-if="projectForm.contractPath" :href="projectForm.contractPath" target="_blank" rel="noreferrer">{{ projectForm.contractName }}</a>
              <span v-else>{{ t('project.noContract') }}</span>
            </div>
          </el-form-item>
        </template>
        <template v-else>
          <el-form-item :label="t('project.objective')" required><el-input v-model="projectForm.objective" type="textarea" /></el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button v-if="editingProjectId" type="danger" plain @click="deleteProject">{{ t('common.delete') }}</el-button>
        <el-button @click="projectDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="submitProject">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="taskDialogVisible" :title="taskDialogTitle" width="620px">
      <el-form :model="taskForm" label-position="top">
        <el-form-item :label="t('task.name')" required><el-input v-model="taskForm.title" /></el-form-item>
        <el-form-item :label="t('task.description')"><el-input v-model="taskForm.description" type="textarea" /></el-form-item>
        <el-form-item :label="t('common.assignee')">
          <el-select v-model="taskForm.assigneeId" style="width: 100%">
            <el-option v-for="user in users" :key="user.id" :label="user.name" :value="user.id" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('common.status')">
          <el-select v-model="taskForm.status" style="width: 100%">
            <el-option :label="t('status.todo')" value="todo" />
            <el-option :label="t('status.doing')" value="doing" />
            <el-option :label="t('status.review')" value="review" />
            <el-option :label="t('status.done')" value="done" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('task.priority')">
          <el-select v-model="taskForm.priority" style="width: 100%">
            <el-option :label="t('priority.low')" value="low" />
            <el-option :label="t('priority.medium')" value="medium" />
            <el-option :label="t('priority.high')" value="high" />
            <el-option :label="t('priority.urgent')" value="urgent" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('common.progress')"><el-slider v-model="taskForm.progress" :step="5" show-input /></el-form-item>
        <el-form-item :label="t('task.progressNote')"><el-input v-model="taskForm.progressNote" type="textarea" /></el-form-item>
        <el-form-item :label="t('task.dueDate')"><el-date-picker v-model="taskForm.dueDate" value-format="YYYY-MM-DD" style="width: 100%" /></el-form-item>
        <el-form-item :label="t('task.recurrence')">
          <el-select v-model="taskForm.recurrenceType" style="width: 100%">
            <el-option v-for="item in recurrenceTypes" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <template v-if="taskForm.recurrenceType && taskForm.recurrenceType !== 'none'">
          <el-form-item :label="t('task.recurrenceInterval')" required>
            <el-input-number v-model="taskForm.recurrenceInterval" :min="1" style="width: 100%" />
          </el-form-item>
          <el-form-item :label="t('task.recurrenceTime')">
            <el-time-picker v-model="taskForm.recurrenceTime" value-format="HH:mm" format="HH:mm" style="width: 100%" />
          </el-form-item>
          <el-form-item v-if="taskForm.recurrenceType === 'weekly'" :label="t('task.recurrenceDayOfWeek')" required>
            <el-select v-model="taskForm.recurrenceDayOfWeek" style="width: 100%">
              <el-option v-for="day in weekDays" :key="day.value" :label="day.label" :value="day.value" />
            </el-select>
          </el-form-item>
          <el-form-item v-if="taskForm.recurrenceType === 'monthly'" :label="t('task.recurrenceDayOfMonth')" required>
            <el-input-number v-model="taskForm.recurrenceDayOfMonth" :min="1" :max="31" style="width: 100%" />
          </el-form-item>
          <el-form-item v-if="taskForm.recurrenceType === 'custom'" :label="t('task.recurrenceCron')" required>
            <el-input v-model="taskForm.recurrenceCron" placeholder="0 9 * * 1" />
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button v-if="editingTask" type="danger" plain @click="deleteTask(editingTask)">{{ t('common.delete') }}</el-button>
        <el-button @click="taskDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveTask">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>
