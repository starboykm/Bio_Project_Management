<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { http } from '../api/http';
import { loadTranslations, t } from '../i18n';

type UserRow = {
  id?: string;
  name: string;
  email: string;
  password?: string;
  roles: string[];
  permissions: string[];
  effectivePermissions?: string[];
  title?: string;
  department?: string;
  phone?: string;
  wechat?: string;
  avatarUrl?: string;
  language?: 'zh' | 'en';
  isActive: boolean;
};

type RoleRow = {
  id?: string;
  code: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
};

type TranslationRow = {
  id?: string;
  key: string;
  zh: string;
  en: string;
  module?: string;
};
type TagRow = {
  id?: string;
  name: string;
  color?: string;
};
type FormField = {
  id: string;
  label: string;
  key: string;
  type: 'text' | 'textarea' | 'select' | 'date' | 'number' | 'user';
  required?: boolean;
  defaultValue?: string;
  options?: string[];
  showInReport?: boolean;
  showInDashboard?: boolean;
};
type FormDefinition = {
  id?: string;
  code: string;
  name: string;
  description?: string;
  fields: FormField[];
  viewMode: 'report' | 'board' | 'table';
  showInReport: boolean;
  showInDashboard: boolean;
  isActive: boolean;
};

const permissionGroups = [
  { labelKey: 'permission.admin', items: ['admin:manage', 'user:read', 'user:write'] },
  { labelKey: 'permission.project', items: ['project:read', 'project:write', 'project:comment'] },
  { labelKey: 'permission.task', items: ['task:read', 'task:write'] },
  { labelKey: 'permission.knowledge', items: ['knowledge:read', 'knowledge:write', 'knowledge:manage'] },
  { labelKey: 'form.title', items: ['form:read', 'form:manage'] },
  { labelKey: 'nav.crm', items: ['crm:read', 'crm:write'] },
  { labelKey: 'permission.reportNotification', items: ['report:read', 'notification:read', 'notification:write'] },
];

const permissionLabelKey: Record<string, string> = {
  'admin:manage': 'permission.adminManage',
  'user:read': 'permission.userRead',
  'user:write': 'permission.userWrite',
  'project:read': 'permission.projectRead',
  'project:write': 'permission.projectWrite',
  'project:comment': 'permission.projectComment',
  'task:read': 'permission.taskRead',
  'task:write': 'permission.taskWrite',
  'knowledge:read': 'permission.knowledgeRead',
  'knowledge:write': 'permission.knowledgeWrite',
  'knowledge:manage': 'permission.knowledgeManage',
  'form:read': 'permission.formRead',
  'form:manage': 'permission.formManage',
  'crm:read': 'permission.crmRead',
  'crm:write': 'permission.crmWrite',
  'report:read': 'permission.reportRead',
  'notification:read': 'permission.notificationRead',
  'notification:write': 'permission.notificationWrite',
};

const activeTab = ref('users');
const users = ref<UserRow[]>([]);
const roles = ref<RoleRow[]>([]);
const translations = ref<TranslationRow[]>([]);
const tags = ref<TagRow[]>([]);
const forms = ref<FormDefinition[]>([]);

const userDrawerVisible = ref(false);
const roleDrawerVisible = ref(false);
const translationDrawerVisible = ref(false);
const tagDrawerVisible = ref(false);
const formDrawerVisible = ref(false);
const editingUserId = ref<string | undefined>();
const editingRoleId = ref<string | undefined>();
const editingTranslationId = ref<string | undefined>();
const editingTagId = ref<string | undefined>();
const editingFormId = ref<string | undefined>();

const userForm = reactive<UserRow>({
  name: '',
  email: '',
  password: '',
  roles: ['member'],
  permissions: [],
  title: '',
  department: '',
  phone: '',
  wechat: '',
  language: 'zh',
  isActive: true,
});

const roleForm = reactive<RoleRow>({
  code: '',
  name: '',
  description: '',
  permissions: [],
  isSystem: false,
});

const translationForm = reactive<TranslationRow>({
  key: '',
  zh: '',
  en: '',
  module: '',
});
const tagForm = reactive<TagRow>({
  name: '',
  color: '',
});
const formDefinition = reactive<FormDefinition>({
  code: '',
  name: '',
  description: '',
  fields: [],
  viewMode: 'table',
  showInReport: true,
  showInDashboard: true,
  isActive: true,
});

const userDrawerTitle = computed(() => (editingUserId.value ? t('admin.editUser') : t('admin.addUser')));
const roleDrawerTitle = computed(() => (editingRoleId.value ? t('admin.editRole') : t('admin.addRole')));
const translationDrawerTitle = computed(() => (editingTranslationId.value ? t('admin.editTranslation') : t('admin.addTranslation')));
const tagDrawerTitle = computed(() => (editingTagId.value ? t('admin.editTag') : t('admin.addTag')));
const formDrawerTitle = computed(() => (editingFormId.value ? t('form.edit') : t('form.new')));

function permissionName(permission: string) {
  const key = permissionLabelKey[permission];
  return key ? t(key) : permission;
}

async function loadUsers() {
  const { data } = await http.get('/users');
  users.value = data;
}

async function loadRoles() {
  const { data } = await http.get('/roles');
  roles.value = data;
}

async function loadTranslationRows() {
  const { data } = await http.get('/translations');
  translations.value = data;
}

async function loadTags() {
  const { data } = await http.get('/knowledge/tags');
  tags.value = data;
}

async function loadForms() {
  const { data } = await http.get('/forms');
  forms.value = data;
}

async function loadAll() {
  await Promise.all([loadUsers(), loadRoles(), loadTranslationRows(), loadTags(), loadForms()]);
}

function openCreateUser() {
  editingUserId.value = undefined;
  Object.assign(userForm, {
    name: '',
    email: '',
    password: 'User123456',
    roles: ['member'],
    permissions: [],
    title: '',
    department: '',
    phone: '',
    wechat: '',
    language: 'zh',
    isActive: true,
  });
  userDrawerVisible.value = true;
}

function openEditUser(row: UserRow) {
  editingUserId.value = row.id;
  Object.assign(userForm, { ...row, password: '' });
  userDrawerVisible.value = true;
}

async function saveUser() {
  const payload = { ...userForm };
  if (!payload.password) delete payload.password;
  if (editingUserId.value) {
    await http.patch(`/users/${editingUserId.value}`, payload);
  } else {
    await http.post('/users', payload);
  }
  userDrawerVisible.value = false;
  await loadUsers();
}

function openCreateRole() {
  editingRoleId.value = undefined;
  Object.assign(roleForm, { code: '', name: '', description: '', permissions: [], isSystem: false });
  roleDrawerVisible.value = true;
}

function openEditRole(row: RoleRow) {
  editingRoleId.value = row.id;
  Object.assign(roleForm, row);
  roleDrawerVisible.value = true;
}

async function saveRole() {
  if (editingRoleId.value) {
    await http.patch(`/roles/${editingRoleId.value}`, roleForm);
  } else {
    await http.post('/roles', roleForm);
  }
  roleDrawerVisible.value = false;
  await Promise.all([loadRoles(), loadUsers()]);
}

function openCreateTranslation() {
  editingTranslationId.value = undefined;
  Object.assign(translationForm, { key: '', zh: '', en: '', module: '' });
  translationDrawerVisible.value = true;
}

function openEditTranslation(row: TranslationRow) {
  editingTranslationId.value = row.id;
  Object.assign(translationForm, row);
  translationDrawerVisible.value = true;
}

async function saveTranslation() {
  if (editingTranslationId.value) {
    await http.patch(`/translations/${editingTranslationId.value}`, translationForm);
  } else {
    await http.post('/translations', translationForm);
  }
  translationDrawerVisible.value = false;
  await Promise.all([loadTranslationRows(), loadTranslations()]);
}

function openCreateTag() {
  editingTagId.value = undefined;
  Object.assign(tagForm, { name: '', color: '' });
  tagDrawerVisible.value = true;
}

function openEditTag(row: TagRow) {
  editingTagId.value = row.id;
  Object.assign(tagForm, row);
  tagDrawerVisible.value = true;
}

async function saveTag() {
  if (editingTagId.value) {
    await http.patch(`/knowledge/tags/${editingTagId.value}`, tagForm);
  } else {
    await http.post('/knowledge/tags', tagForm);
  }
  tagDrawerVisible.value = false;
  await loadTags();
}

async function deleteTag(row: TagRow) {
  if (!row.id) return;
  await http.delete(`/knowledge/tags/${row.id}`);
  await loadTags();
}

function emptyField(): FormField {
  const stamp = Date.now().toString();
  return {
    id: `field_${stamp}`,
    key: `field_${stamp}`,
    label: t('form.field'),
    type: 'text',
    required: false,
    defaultValue: '',
    options: [],
    showInReport: true,
    showInDashboard: false,
  };
}

function openCreateForm() {
  editingFormId.value = undefined;
  Object.assign(formDefinition, {
    code: '',
    name: '',
    description: '',
    fields: [emptyField()],
    viewMode: 'table',
    showInReport: true,
    showInDashboard: true,
    isActive: true,
  });
  formDrawerVisible.value = true;
}

function openEditForm(row: FormDefinition) {
  editingFormId.value = row.id;
  Object.assign(formDefinition, {
    ...row,
    fields: (row.fields || []).map((field) => ({ ...field, options: field.options || [] })),
  });
  formDrawerVisible.value = true;
}

function addFormField() {
  formDefinition.fields.push(emptyField());
}

function removeFormField(index: number) {
  formDefinition.fields.splice(index, 1);
}

async function saveFormDefinition() {
  const payload = {
    ...formDefinition,
    fields: formDefinition.fields.map((field) => ({
      ...field,
      id: field.id || field.key || `field_${Date.now()}`,
      options: Array.isArray(field.options) ? field.options : String(field.options || '').split(',').map((item) => item.trim()).filter(Boolean),
    })),
  };
  if (editingFormId.value) {
    await http.patch(`/forms/${editingFormId.value}`, payload);
  } else {
    await http.post('/forms', payload);
  }
  formDrawerVisible.value = false;
  await loadForms();
}

onMounted(loadAll);
</script>

<template>
  <div>
    <header class="page-header">
      <div>
        <h1>{{ t('admin.title') }}</h1>
        <p>{{ t('admin.subtitle') }}</p>
      </div>
    </header>

    <el-tabs v-model="activeTab" class="work-panel admin-tabs">
      <el-tab-pane :label="t('admin.users')" name="users">
        <div class="tab-toolbar">
          <el-button type="primary" @click="openCreateUser">{{ t('admin.addUser') }}</el-button>
        </div>
        <el-table :data="users">
          <el-table-column prop="name" :label="t('common.name')" min-width="150" />
          <el-table-column prop="email" :label="t('common.email')" min-width="220" />
          <el-table-column prop="department" :label="t('common.department')" width="120" />
          <el-table-column prop="title" :label="t('common.title')" width="120" />
          <el-table-column :label="t('common.roles')" min-width="180">
            <template #default="{ row }">
              <el-tag v-for="role in row.roles" :key="role" style="margin-right: 6px">{{ role }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="t('common.language')" width="110">
            <template #default="{ row }">{{ row.language === 'en' ? t('common.english') : t('common.chinese') }}</template>
          </el-table-column>
          <el-table-column :label="t('common.status')" width="100">
            <template #default="{ row }">
              <el-tag :type="row.isActive ? 'success' : 'info'">{{ row.isActive ? t('common.enabled') : t('common.disabled') }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="t('common.operation')" width="100" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openEditUser(row)">{{ t('common.edit') }}</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane :label="t('admin.roles')" name="roles">
        <div class="tab-toolbar">
          <el-button type="primary" @click="openCreateRole">{{ t('admin.addRole') }}</el-button>
        </div>
        <el-table :data="roles">
          <el-table-column prop="code" :label="t('admin.roleCode')" width="140" />
          <el-table-column prop="name" :label="t('admin.roleName')" width="160" />
          <el-table-column prop="description" :label="t('common.description')" min-width="220" />
          <el-table-column :label="t('common.permissions')" min-width="300">
            <template #default="{ row }">
              <el-tag v-for="permission in row.permissions" :key="permission" style="margin: 0 6px 6px 0">
                {{ permissionName(permission) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="t('common.operation')" width="100" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openEditRole(row)">{{ t('common.edit') }}</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane :label="t('admin.translations')" name="translations">
        <div class="tab-toolbar">
          <el-button type="primary" @click="openCreateTranslation">{{ t('admin.addTranslation') }}</el-button>
        </div>
        <el-table :data="translations">
          <el-table-column prop="module" :label="t('common.module')" width="140" />
          <el-table-column prop="key" :label="t('admin.translationKey')" min-width="220" />
          <el-table-column prop="zh" :label="t('common.zh')" min-width="180" />
          <el-table-column prop="en" label="English" min-width="180" />
          <el-table-column :label="t('common.operation')" width="100" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openEditTranslation(row)">{{ t('common.edit') }}</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane :label="t('admin.tags')" name="tags">
        <div class="tab-toolbar">
          <el-button type="primary" @click="openCreateTag">{{ t('admin.addTag') }}</el-button>
        </div>
        <el-table :data="tags">
          <el-table-column prop="name" :label="t('knowledge.tags')" min-width="220" />
          <el-table-column prop="color" :label="t('common.description')" min-width="140" />
          <el-table-column :label="t('common.operation')" width="150" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openEditTag(row)">{{ t('common.edit') }}</el-button>
              <el-button link type="danger" @click="deleteTag(row)">{{ t('common.delete') }}</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane :label="t('form.title')" name="forms">
        <div class="tab-toolbar">
          <el-button type="primary" @click="openCreateForm">{{ t('form.new') }}</el-button>
        </div>
        <el-table :data="forms">
          <el-table-column prop="code" :label="t('form.code')" width="130" />
          <el-table-column prop="name" :label="t('form.name')" min-width="180" />
          <el-table-column prop="description" :label="t('common.description')" min-width="220" />
          <el-table-column :label="t('form.viewMode')" width="120">
            <template #default="{ row }">{{ t(`form.viewMode.${row.viewMode}`) }}</template>
          </el-table-column>
          <el-table-column :label="t('form.fields')" width="100">
            <template #default="{ row }">{{ row.fields?.length || 0 }}</template>
          </el-table-column>
          <el-table-column :label="t('common.operation')" width="100" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openEditForm(row)">{{ t('common.edit') }}</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <el-drawer v-model="userDrawerVisible" :title="userDrawerTitle" size="540px">
      <el-form :model="userForm" label-position="top">
        <el-form-item :label="t('common.name')"><el-input v-model="userForm.name" /></el-form-item>
        <el-form-item :label="t('common.email')"><el-input v-model="userForm.email" /></el-form-item>
        <el-form-item :label="t('common.password')"><el-input v-model="userForm.password" type="password" show-password /></el-form-item>
        <el-form-item :label="t('common.department')"><el-input v-model="userForm.department" /></el-form-item>
        <el-form-item :label="t('common.title')"><el-input v-model="userForm.title" /></el-form-item>
        <el-form-item :label="t('common.phone')"><el-input v-model="userForm.phone" /></el-form-item>
        <el-form-item :label="t('common.wechat')"><el-input v-model="userForm.wechat" /></el-form-item>
        <el-form-item :label="t('common.roles')">
          <el-select v-model="userForm.roles" multiple style="width: 100%">
            <el-option v-for="role in roles" :key="role.code" :label="role.name" :value="role.code" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('admin.userPermissions')">
          <div class="permission-groups">
            <div v-for="group in permissionGroups" :key="group.labelKey" class="permission-group">
              <strong>{{ t(group.labelKey) }}</strong>
              <el-checkbox-group v-model="userForm.permissions">
                <el-checkbox v-for="permission in group.items" :key="permission" :label="permission">
                  {{ permissionName(permission) }}
                </el-checkbox>
              </el-checkbox-group>
            </div>
          </div>
        </el-form-item>
        <el-form-item :label="t('common.language')">
          <el-select v-model="userForm.language" style="width: 100%">
            <el-option :label="t('common.chinese')" value="zh" />
            <el-option :label="t('common.english')" value="en" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('common.accountStatus')">
          <el-switch v-model="userForm.isActive" :active-text="t('common.enabled')" :inactive-text="t('common.disabled')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="userDrawerVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveUser">{{ t('common.save') }}</el-button>
      </template>
    </el-drawer>

    <el-drawer v-model="roleDrawerVisible" :title="roleDrawerTitle" size="520px">
      <el-form :model="roleForm" label-position="top">
        <el-form-item :label="t('admin.roleCode')"><el-input v-model="roleForm.code" :disabled="roleForm.isSystem && Boolean(editingRoleId)" /></el-form-item>
        <el-form-item :label="t('admin.roleName')"><el-input v-model="roleForm.name" /></el-form-item>
        <el-form-item :label="t('common.description')"><el-input v-model="roleForm.description" type="textarea" /></el-form-item>
        <el-form-item :label="t('admin.rolePermissions')">
          <div class="permission-groups">
            <div v-for="group in permissionGroups" :key="group.labelKey" class="permission-group">
              <strong>{{ t(group.labelKey) }}</strong>
              <el-checkbox-group v-model="roleForm.permissions">
                <el-checkbox v-for="permission in group.items" :key="permission" :label="permission">
                  {{ permissionName(permission) }}
                </el-checkbox>
              </el-checkbox-group>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="roleDrawerVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveRole">{{ t('common.save') }}</el-button>
      </template>
    </el-drawer>

    <el-drawer v-model="translationDrawerVisible" :title="translationDrawerTitle" size="520px">
      <el-form :model="translationForm" label-position="top">
        <el-form-item :label="t('common.module')"><el-input v-model="translationForm.module" /></el-form-item>
        <el-form-item :label="t('admin.translationKey')"><el-input v-model="translationForm.key" /></el-form-item>
        <el-form-item :label="t('common.zh')"><el-input v-model="translationForm.zh" /></el-form-item>
        <el-form-item label="English"><el-input v-model="translationForm.en" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="translationDrawerVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveTranslation">{{ t('common.save') }}</el-button>
      </template>
    </el-drawer>

    <el-drawer v-model="tagDrawerVisible" :title="tagDrawerTitle" size="420px">
      <el-form :model="tagForm" label-position="top">
        <el-form-item :label="t('knowledge.tags')"><el-input v-model="tagForm.name" /></el-form-item>
        <el-form-item :label="t('admin.tagColor')"><el-input v-model="tagForm.color" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="tagDrawerVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveTag">{{ t('common.save') }}</el-button>
      </template>
    </el-drawer>

    <el-drawer v-model="formDrawerVisible" :title="formDrawerTitle" size="760px">
      <el-form :model="formDefinition" label-position="top">
        <div class="editor-grid">
          <el-form-item :label="t('form.code')"><el-input v-model="formDefinition.code" /></el-form-item>
          <el-form-item :label="t('form.name')"><el-input v-model="formDefinition.name" /></el-form-item>
        </div>
        <el-form-item :label="t('common.description')"><el-input v-model="formDefinition.description" type="textarea" /></el-form-item>
        <div class="editor-grid">
          <el-form-item :label="t('form.viewMode')">
            <el-select v-model="formDefinition.viewMode" style="width: 100%">
              <el-option :label="t('form.viewMode.table')" value="table" />
              <el-option :label="t('form.viewMode.report')" value="report" />
              <el-option :label="t('form.viewMode.board')" value="board" />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('common.status')">
            <el-switch v-model="formDefinition.isActive" :active-text="t('common.enabled')" :inactive-text="t('common.disabled')" />
          </el-form-item>
        </div>
        <div class="toolbar-actions">
          <el-checkbox v-model="formDefinition.showInReport">{{ t('form.showInReport') }}</el-checkbox>
          <el-checkbox v-model="formDefinition.showInDashboard">{{ t('form.showInDashboard') }}</el-checkbox>
          <el-button size="small" type="primary" @click="addFormField">{{ t('form.addField') }}</el-button>
        </div>
        <div class="form-field-list">
          <div v-for="(field, index) in formDefinition.fields" :key="field.id" class="form-field-row">
            <el-input v-model="field.label" :placeholder="t('form.fieldLabel')" />
            <el-input v-model="field.key" :placeholder="t('form.fieldKey')" />
            <el-select v-model="field.type">
              <el-option label="text" value="text" />
              <el-option label="textarea" value="textarea" />
              <el-option label="select" value="select" />
              <el-option label="date" value="date" />
              <el-option label="number" value="number" />
              <el-option label="user" value="user" />
            </el-select>
            <el-input v-model="field.defaultValue" :placeholder="t('form.defaultValue')" />
            <el-select v-model="field.options" multiple filterable allow-create :placeholder="t('form.options')" />
            <el-checkbox v-model="field.required">{{ t('form.required') }}</el-checkbox>
            <el-checkbox v-model="field.showInReport">{{ t('form.reportShort') }}</el-checkbox>
            <el-checkbox v-model="field.showInDashboard">{{ t('form.dashboardShort') }}</el-checkbox>
            <el-button type="danger" plain @click="removeFormField(index)">{{ t('common.delete') }}</el-button>
          </div>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="formDrawerVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveFormDefinition">{{ t('common.save') }}</el-button>
      </template>
    </el-drawer>
  </div>
</template>
