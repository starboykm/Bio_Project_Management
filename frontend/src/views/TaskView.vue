<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { http } from '../api/http';
import { t } from '../i18n';

type UserOption = { id: string; name: string };
type ProjectOption = { id: string; name: string };
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

const columns = [
  { key: 'todo', titleKey: 'status.todo' },
  { key: 'doing', titleKey: 'status.doing' },
  { key: 'review', titleKey: 'status.review' },
  { key: 'done', titleKey: 'status.done' },
];

const tasks = ref<Task[]>([]);
const users = ref<UserOption[]>([]);
const projects = ref<ProjectOption[]>([]);
const scope = ref<'mine' | 'all'>('mine');
const dialogVisible = ref(false);
const editingTask = ref<Task | null>(null);
const form = reactive<Task>({
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
const route = useRoute();

const scopeOptions = computed(() => [
  { label: t('task.mine'), value: 'mine' },
  { label: t('task.all'), value: 'all' },
]);
const dialogTitle = computed(() => (editingTask.value ? t('task.edit') : t('task.new')));
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

function projectName(id?: string) {
  return projects.value.find((project) => project.id === id)?.name || '-';
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

function payload() {
  return compactPayload({
    title: form.title,
    description: form.description,
    projectId: form.projectId,
    assigneeId: form.assigneeId,
    status: form.status,
    priority: form.priority,
    progress: form.status === 'done' ? 100 : form.progress,
    progressNote: form.progressNote,
    dueDate: form.dueDate,
    recurrenceType: form.recurrenceType || 'none',
    recurrenceInterval: form.recurrenceType && form.recurrenceType !== 'none' ? form.recurrenceInterval || 1 : undefined,
    recurrenceTime: form.recurrenceTime,
    recurrenceDayOfWeek: form.recurrenceType === 'weekly' ? form.recurrenceDayOfWeek : undefined,
    recurrenceDayOfMonth: form.recurrenceType === 'monthly' ? form.recurrenceDayOfMonth : undefined,
    recurrenceCron: form.recurrenceType === 'custom' ? form.recurrenceCron : undefined,
  });
}

function validateForm() {
  if (!form.title.trim()) {
    ElMessage.error(t('task.validation.title'));
    return false;
  }
  if (form.recurrenceType === 'custom' && !form.recurrenceCron?.trim()) {
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

async function loadProjects() {
  const { data } = await http.get('/projects');
  projects.value = data;
}

async function loadTasks() {
  const { data } = await http.get('/tasks', { params: { scope: scope.value } });
  tasks.value = data;
  const taskId = typeof route.query.taskId === 'string' ? route.query.taskId : undefined;
  const target = taskId ? tasks.value.find((task) => task.id === taskId) : undefined;
  if (target) {
    openEdit(target);
  }
}

function resetForm() {
  Object.assign(form, {
    title: '',
    description: '',
    projectId: '',
    assigneeId: users.value[0]?.id || '',
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

function openCreate() {
  editingTask.value = null;
  resetForm();
  dialogVisible.value = true;
}

function openEdit(task: Task) {
  editingTask.value = task;
  Object.assign(form, {
    ...task,
    dueDate: task.dueDate || '',
    recurrenceType: task.recurrenceType || 'none',
    recurrenceInterval: task.recurrenceInterval || 1,
    recurrenceTime: task.recurrenceTime || '',
    recurrenceDayOfWeek: task.recurrenceDayOfWeek || 1,
    recurrenceDayOfMonth: task.recurrenceDayOfMonth || 1,
    recurrenceCron: task.recurrenceCron || '',
  });
  dialogVisible.value = true;
}

async function saveTask() {
  if (!validateForm()) return;
  try {
    if (editingTask.value?.id) {
      await http.patch(`/tasks/${editingTask.value.id}`, payload());
    } else {
      await http.post('/tasks', payload());
    }
    dialogVisible.value = false;
    await Promise.all([loadProjects(), loadTasks()]);
    ElMessage.success(t('common.saveSuccess'));
  } catch (error) {
    ElMessage.error(apiErrorMessage(error));
  }
}

async function deleteTask(task: Task | null) {
  if (!task?.id || !(await confirmDelete(t('task.deleteConfirm')))) return;
  await http.delete(`/tasks/${task.id}`);
  dialogVisible.value = false;
  await Promise.all([loadProjects(), loadTasks()]);
}

onMounted(async () => {
  if (typeof route.query.taskId === 'string') {
    scope.value = 'all';
  }
  await loadUsers();
  await loadProjects();
  await loadTasks();
});
</script>

<template>
  <div>
    <header class="page-header">
      <div>
        <h1>{{ t('task.title') }}</h1>
        <p>{{ t('task.subtitle') }}</p>
      </div>
      <div class="toolbar-actions">
        <el-segmented v-model="scope" :options="scopeOptions" @change="loadTasks" />
        <el-button type="primary" @click="openCreate">{{ t('task.new') }}</el-button>
      </div>
    </header>

    <section class="board">
      <div v-for="column in columns" :key="column.key" class="board-column">
        <h3>{{ t(column.titleKey) }}</h3>
        <button
          v-for="task in tasks.filter((item) => item.status === column.key)"
          :key="task.id"
          class="task-card task-card-button"
          @click="openEdit(task)"
        >
          <strong>{{ task.title }}</strong>
          <p>{{ projectName(task.projectId) }}</p>
          <span>{{ t('common.assignee') }}: {{ userName(task.assigneeId) }}</span>
          <span>{{ t('task.recurrence') }}: {{ recurrenceLabel(task) }}</span>
          <el-progress :percentage="task.progress || 0" />
        </button>
      </div>
    </section>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="620px">
      <el-form :model="form" label-position="top">
        <el-form-item :label="t('task.name')" required><el-input v-model="form.title" /></el-form-item>
        <el-form-item :label="t('task.description')"><el-input v-model="form.description" type="textarea" /></el-form-item>
        <el-form-item :label="t('task.project')">
          <el-select v-model="form.projectId" clearable style="width: 100%">
            <el-option v-for="project in projects" :key="project.id" :label="project.name" :value="project.id" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('common.assignee')">
          <el-select v-model="form.assigneeId" style="width: 100%">
            <el-option v-for="user in users" :key="user.id" :label="user.name" :value="user.id" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('common.status')">
          <el-select v-model="form.status" style="width: 100%">
            <el-option :label="t('status.todo')" value="todo" />
            <el-option :label="t('status.doing')" value="doing" />
            <el-option :label="t('status.review')" value="review" />
            <el-option :label="t('status.done')" value="done" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('task.priority')">
          <el-select v-model="form.priority" style="width: 100%">
            <el-option :label="t('priority.low')" value="low" />
            <el-option :label="t('priority.medium')" value="medium" />
            <el-option :label="t('priority.high')" value="high" />
            <el-option :label="t('priority.urgent')" value="urgent" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('common.progress')"><el-slider v-model="form.progress" :step="5" show-input /></el-form-item>
        <el-form-item :label="t('task.progressNote')"><el-input v-model="form.progressNote" type="textarea" /></el-form-item>
        <el-form-item :label="t('task.dueDate')"><el-date-picker v-model="form.dueDate" value-format="YYYY-MM-DD" style="width: 100%" /></el-form-item>
        <el-form-item :label="t('task.recurrence')">
          <el-select v-model="form.recurrenceType" style="width: 100%">
            <el-option v-for="item in recurrenceTypes" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <template v-if="form.recurrenceType && form.recurrenceType !== 'none'">
          <el-form-item :label="t('task.recurrenceInterval')" required>
            <el-input-number v-model="form.recurrenceInterval" :min="1" style="width: 100%" />
          </el-form-item>
          <el-form-item :label="t('task.recurrenceTime')">
            <el-time-picker v-model="form.recurrenceTime" value-format="HH:mm" format="HH:mm" style="width: 100%" />
          </el-form-item>
          <el-form-item v-if="form.recurrenceType === 'weekly'" :label="t('task.recurrenceDayOfWeek')" required>
            <el-select v-model="form.recurrenceDayOfWeek" style="width: 100%">
              <el-option v-for="day in weekDays" :key="day.value" :label="day.label" :value="day.value" />
            </el-select>
          </el-form-item>
          <el-form-item v-if="form.recurrenceType === 'monthly'" :label="t('task.recurrenceDayOfMonth')" required>
            <el-input-number v-model="form.recurrenceDayOfMonth" :min="1" :max="31" style="width: 100%" />
          </el-form-item>
          <el-form-item v-if="form.recurrenceType === 'custom'" :label="t('task.recurrenceCron')" required>
            <el-input v-model="form.recurrenceCron" placeholder="0 9 * * 1" />
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button v-if="editingTask" type="danger" plain @click="deleteTask(editingTask)">{{ t('common.delete') }}</el-button>
        <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveTask">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>
