<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { http } from '../api/http';
import MentionInput from '../components/MentionInput.vue';
import { t } from '../i18n';

type UserOption = { id: string; name: string; email: string };
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
};

const projects = ref<Project[]>([]);
const users = ref<UserOption[]>([]);
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
});

const ownerName = computed(() => users.value.find((user) => user.id === selected.value?.ownerId)?.name || '-');
const projectDialogTitle = computed(() => (editingProjectId.value ? t('project.edit') : t('project.new')));
const taskDialogTitle = computed(() => (editingTask.value ? t('task.edit') : t('task.new')));

function userName(id?: string) {
  return users.value.find((user) => user.id === id)?.name || '-';
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
  };
  return compactPayload(payload);
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
    ownerId: selected.value.ownerId || '',
    participantIds: selected.value.participantIds || [],
  });
  projectDialogVisible.value = true;
}

async function submitProject() {
  if (editingProjectId.value) {
    await http.patch(`/projects/${editingProjectId.value}`, projectPayload());
    selectedId.value = editingProjectId.value;
  } else {
    const { data } = await http.post('/projects', projectPayload());
    selectedId.value = data.id;
  }
  projectDialogVisible.value = false;
  await loadProjects();
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
  });
  taskDialogVisible.value = true;
}

async function saveTask() {
  try {
    if (editingTask.value?.id) {
      await http.patch(`/tasks/${editingTask.value.id}`, taskPayload());
    } else {
      await http.post('/tasks', taskPayload());
    }
    taskDialogVisible.value = false;
    await refreshSelectedProject();
    ElMessage.success(t('common.saveSuccess'));
  } catch {
    ElMessage.error(t('common.saveFailed'));
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
  await Promise.all([loadUsers(), loadMentionOptions()]);
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
            <p>{{ t('common.owner') }}: {{ ownerName }} · {{ t('project.cropType') }}: {{ selected.cropType || '-' }} · {{ t('project.trialField') }}: {{ selected.trialField || '-' }}</p>
          </div>
          <el-progress type="dashboard" :percentage="selected.progress || 0" :width="86" />
        </div>

        <el-descriptions :column="2" border>
          <el-descriptions-item :label="t('project.microbialBatch')">{{ selected.microbialBatch || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="t('common.status')">{{ t(`status.${selected.status}`) }}</el-descriptions-item>
          <el-descriptions-item :label="t('project.participants')">
            {{ (selected.participantIds || []).map(userName).join('、') || '-' }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('project.latestUpdate')">{{ selected.latestUpdate || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="t('project.fertilizationPlan')" :span="2">{{ selected.fertilizationPlan || '-' }}</el-descriptions-item>
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
        <el-form-item :label="t('project.name')"><el-input v-model="projectForm.name" /></el-form-item>
        <el-form-item :label="t('common.owner')">
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
        <el-form-item :label="t('project.cropType')"><el-input v-model="projectForm.cropType" /></el-form-item>
        <el-form-item :label="t('project.trialField')"><el-input v-model="projectForm.trialField" /></el-form-item>
        <el-form-item :label="t('project.microbialBatch')"><el-input v-model="projectForm.microbialBatch" /></el-form-item>
        <el-form-item :label="t('project.fertilizationPlan')"><el-input v-model="projectForm.fertilizationPlan" type="textarea" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button v-if="editingProjectId" type="danger" plain @click="deleteProject">{{ t('common.delete') }}</el-button>
        <el-button @click="projectDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="submitProject">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="taskDialogVisible" :title="taskDialogTitle" width="620px">
      <el-form :model="taskForm" label-position="top">
        <el-form-item :label="t('task.name')"><el-input v-model="taskForm.title" /></el-form-item>
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
      </el-form>
      <template #footer>
        <el-button v-if="editingTask" type="danger" plain @click="deleteTask(editingTask)">{{ t('common.delete') }}</el-button>
        <el-button @click="taskDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveTask">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>
