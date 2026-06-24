<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { http } from '../api/http';
import { t } from '../i18n';

type UserOption = { id: string; name: string; email: string };
type FollowUpStatus = 'pending' | 'followed' | 'cooperated';
type FollowUpRecord = {
  id: string;
  date: string;
  status: FollowUpStatus;
  note?: string;
  userId?: string;
  nextFollowUpDate?: string;
  createdAt: string;
};
type Customer = {
  [key: string]: any;
  id?: string;
  name: string;
  region?: string;
  industry?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  stage: 'lead' | 'qualified' | 'trial' | 'proposal' | 'won' | 'lost';
  ownerId?: string;
  trackingUserId?: string;
  address?: string;
  source?: string;
  requirement?: string;
  nextFollowUpDate?: string;
  followUpDate?: string;
  followUpStatus?: FollowUpStatus;
  followUpNote?: string;
  followUpRecords?: FollowUpRecord[];
  nextFollowUpTaskId?: string;
  customData?: Record<string, unknown>;
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
  fields: FormField[];
  viewMode: 'report' | 'board' | 'table';
};

const customers = ref<Customer[]>([]);
const users = ref<UserOption[]>([]);
const selected = ref<Customer | null>(null);
const drawerVisible = ref(false);
const editingId = ref<string>();
const crmFormDefinition = ref<FormDefinition | null>(null);

const form = reactive<Customer>({
  name: '',
  region: '',
  industry: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  stage: 'lead',
  ownerId: '',
  trackingUserId: '',
  address: '',
  source: '',
  requirement: '',
  nextFollowUpDate: '',
  followUpDate: '',
  followUpStatus: 'pending',
  followUpNote: '',
  followUpRecords: [],
  customData: {},
});

const drawerTitle = computed(() => (editingId.value ? t('crm.edit') : t('crm.new')));
const formFields = computed(() => crmFormDefinition.value?.fields?.length ? crmFormDefinition.value.fields : [
  { id: 'name', key: 'name', label: t('crm.customerName'), type: 'text', required: true },
  { id: 'trackingUserId', key: 'trackingUserId', label: t('crm.tracker'), type: 'user', required: true },
  { id: 'stage', key: 'stage', label: t('crm.stage'), type: 'select', required: true, options: ['lead', 'qualified', 'trial', 'proposal', 'won', 'lost'] },
  { id: 'region', key: 'region', label: t('crm.region'), type: 'text' },
  { id: 'contactName', key: 'contactName', label: t('crm.contactName'), type: 'text' },
] as FormField[]);
const editableFormFields = computed(() => formFields.value.filter((field) => !['followUpDate', 'followUpStatus'].includes(field.key)));
const followUpStatusOptions = computed(() => [
  { label: t('crm.followUpStatus.pending'), value: 'pending' },
  { label: t('crm.followUpStatus.followed'), value: 'followed' },
  { label: t('crm.followUpStatus.cooperated'), value: 'cooperated' },
]);
const fixedCustomerKeys = new Set([
  'name',
  'region',
  'industry',
  'contactName',
  'contactPhone',
  'contactEmail',
  'stage',
  'ownerId',
  'trackingUserId',
  'address',
  'source',
  'requirement',
  'nextFollowUpDate',
  'followUpDate',
  'followUpStatus',
  'followUpNote',
  'customData',
]);
const customerPayloadKeys = [
  'name',
  'region',
  'industry',
  'contactName',
  'contactPhone',
  'contactEmail',
  'stage',
  'ownerId',
  'trackingUserId',
  'address',
  'source',
  'requirement',
  'nextFollowUpDate',
  'followUpDate',
  'followUpStatus',
  'followUpNote',
] as const;

function userName(id?: string) {
  return users.value.find((user) => user.id === id)?.name || '-';
}

function followUpStatusLabel(status?: string) {
  return t(`crm.followUpStatus.${status || 'pending'}`);
}

function apiErrorMessage(error: unknown) {
  const response = (error as { response?: { data?: { message?: string | string[] } } }).response;
  const message = response?.data?.message;
  if (Array.isArray(message)) return message.join('；');
  return message || t('common.saveFailed');
}

function cleanValue(value: unknown) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  if (value === '' || value === undefined || value === null) return undefined;
  return value;
}

function validateCustomerForm() {
  if (!form.name.trim()) {
    ElMessage.error(t('crm.validation.name'));
    return false;
  }
  if (!form.trackingUserId) {
    ElMessage.error(t('crm.validation.tracker'));
    return false;
  }
  return true;
}

function resetForm() {
  Object.assign(form, {
    name: '',
    region: '',
    industry: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    stage: 'lead',
    ownerId: users.value[0]?.id || '',
    trackingUserId: users.value[0]?.id || '',
    address: '',
    source: '',
    requirement: '',
    nextFollowUpDate: '',
    followUpDate: '',
    followUpStatus: 'pending',
    followUpNote: '',
    followUpRecords: [],
    nextFollowUpTaskId: '',
    customData: {},
  });
  formFields.value.forEach((field) => {
    if (field.defaultValue && !form[field.key]) form[field.key] = field.defaultValue;
  });
}

async function loadCustomers() {
  const { data } = await http.get('/crm/customers');
  customers.value = data.map(mergeCustomData);
  if (!selected.value && customers.value.length) selected.value = customers.value[0];
  if (selected.value) selected.value = customers.value.find((item) => item.id === selected.value?.id) || customers.value[0] || null;
}

async function loadUsers() {
  const { data } = await http.get('/users');
  users.value = data;
}

async function loadCrmForm() {
  const { data } = await http.get('/forms/code/crm');
  crmFormDefinition.value = data;
}

function openCreate() {
  editingId.value = undefined;
  resetForm();
  drawerVisible.value = true;
}

function openEdit(row: Customer) {
  editingId.value = row.id;
  resetForm();
  Object.assign(form, {
    ...row,
    trackingUserId: row.trackingUserId || row.ownerId || '',
    followUpStatus: row.followUpStatus || 'pending',
    followUpDate: row.followUpDate || '',
    followUpRecords: row.followUpRecords || [],
  });
  drawerVisible.value = true;
}

async function selectCustomer(row: Customer) {
  if (!row.id) return;
  const { data } = await http.get(`/crm/customers/${row.id}`);
  selected.value = mergeCustomData(data);
}

async function saveCustomer() {
  if (!validateCustomerForm()) return;
  const payload: Customer = {} as Customer;
  const payloadRecord = payload as Record<string, unknown>;
  const customData: Record<string, unknown> = {};

  customerPayloadKeys.forEach((key) => {
    const value = cleanValue(form[key]);
    if (value !== undefined) payloadRecord[key] = value;
  });
  payload.ownerId = payload.ownerId || payload.trackingUserId;

  formFields.value.forEach((field) => {
    if (!fixedCustomerKeys.has(field.key)) {
      const value = cleanValue(form[field.key]);
      if (value !== undefined) customData[field.key] = value;
    }
  });

  payload.customData = { ...(form.customData || {}), ...customData };
  try {
    if (editingId.value) {
      const { data } = await http.patch(`/crm/customers/${editingId.value}`, payload);
      selected.value = mergeCustomData(data);
    } else {
      const { data } = await http.post('/crm/customers', payload);
      selected.value = mergeCustomData(data);
    }
    drawerVisible.value = false;
    await loadCustomers();
    ElMessage.success(t('common.saveSuccess'));
  } catch (error) {
    ElMessage.error(apiErrorMessage(error));
  }
}

function mergeCustomData(customer: Customer) {
  return { ...customer, ...(customer.customData || {}) };
}

onMounted(async () => {
  await Promise.all([loadUsers(), loadCrmForm(), loadCustomers()]);
});
</script>

<template>
  <div>
    <header class="page-header">
      <div>
        <h1>{{ t('crm.title') }}</h1>
        <p>{{ t('crm.subtitle') }}</p>
      </div>
      <el-button type="primary" @click="openCreate">{{ t('crm.new') }}</el-button>
    </header>

    <section class="split-grid crm-workspace">
      <div class="work-panel">
        <el-table :data="customers" highlight-current-row @row-click="selectCustomer">
          <el-table-column prop="name" :label="t('crm.customerName')" min-width="220" />
          <el-table-column prop="region" :label="t('crm.region')" width="110" />
          <el-table-column :label="t('crm.stage')" width="130">
            <template #default="{ row }">{{ t(`crm.stage.${row.stage}`) }}</template>
          </el-table-column>
          <el-table-column prop="contactName" :label="t('crm.contactName')" width="130" />
          <el-table-column :label="t('crm.tracker')" width="130">
            <template #default="{ row }">{{ userName(row.trackingUserId || row.ownerId) }}</template>
          </el-table-column>
          <el-table-column :label="t('crm.followUpStatus')" width="120">
            <template #default="{ row }">{{ followUpStatusLabel(row.followUpStatus) }}</template>
          </el-table-column>
          <el-table-column prop="nextFollowUpDate" :label="t('crm.nextFollowUpDate')" width="140" />
        </el-table>
      </div>

      <div v-if="selected" class="work-panel">
        <div class="detail-header">
          <div>
            <h2>{{ selected.name }}</h2>
            <p>
              {{ selected.region || '-' }} · {{ t(`crm.stage.${selected.stage}`) }} · {{ userName(selected.trackingUserId || selected.ownerId) }}
              · {{ followUpStatusLabel(selected.followUpStatus) }}
            </p>
          </div>
          <el-button type="primary" @click="openEdit(selected)">{{ t('common.edit') }}</el-button>
        </div>
        <el-descriptions :column="2" border>
          <el-descriptions-item v-for="field in editableFormFields" :key="field.key" :label="field.label" :span="field.type === 'textarea' ? 2 : 1">
            <template v-if="field.type === 'user'">{{ userName(selected[field.key] as string) }}</template>
            <template v-else-if="field.key === 'stage'">{{ t(`crm.stage.${selected[field.key] || 'lead'}`) }}</template>
            <template v-else>{{ selected[field.key] || '-' }}</template>
          </el-descriptions-item>
          <el-descriptions-item :label="t('crm.followUpStatus')">{{ followUpStatusLabel(selected.followUpStatus) }}</el-descriptions-item>
          <el-descriptions-item :label="t('crm.followUpDate')">{{ selected.followUpDate || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="t('crm.nextFollowUpDate')">{{ selected.nextFollowUpDate || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="t('crm.followUpTask')">
            <router-link v-if="selected.nextFollowUpTaskId" :to="`/task?taskId=${selected.nextFollowUpTaskId}`">{{ t('crm.openFollowUpTask') }}</router-link>
            <span v-else>-</span>
          </el-descriptions-item>
        </el-descriptions>

        <div class="section-title">{{ t('crm.followUpHistory') }}</div>
        <el-timeline v-if="selected.followUpRecords?.length" class="crm-followup-timeline">
          <el-timeline-item v-for="record in [...selected.followUpRecords].reverse()" :key="record.id" :timestamp="record.date">
            <strong>{{ followUpStatusLabel(record.status) }} · {{ userName(record.userId) }}</strong>
            <p>{{ record.note || '-' }}</p>
            <span v-if="record.nextFollowUpDate">{{ t('crm.nextFollowUpDate') }}: {{ record.nextFollowUpDate }}</span>
          </el-timeline-item>
        </el-timeline>
        <el-empty v-else :description="t('crm.noFollowUpHistory')" />
      </div>
    </section>

    <el-drawer v-model="drawerVisible" :title="drawerTitle" size="620px">
      <el-form :model="form" label-position="top">
        <el-form-item v-for="field in editableFormFields" :key="field.key" :label="field.label" :required="field.required">
          <el-input v-if="field.type === 'text'" v-model="form[field.key]" />
          <el-input v-else-if="field.type === 'textarea'" v-model="form[field.key]" type="textarea" />
          <el-input-number v-else-if="field.type === 'number'" v-model="form[field.key]" style="width: 100%" />
          <el-date-picker v-else-if="field.type === 'date'" v-model="form[field.key]" value-format="YYYY-MM-DD" style="width: 100%" />
          <el-select v-else-if="field.type === 'user'" v-model="form[field.key]" filterable style="width: 100%">
            <el-option v-for="user in users" :key="user.id" :label="user.name" :value="user.id" />
          </el-select>
          <el-select v-else v-model="form[field.key]" style="width: 100%">
            <el-option v-for="option in field.options || []" :key="option" :label="field.key === 'stage' ? t(`crm.stage.${option}`) : option" :value="option" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('crm.followUpStatus')">
          <el-select v-model="form.followUpStatus" style="width: 100%">
            <el-option v-for="option in followUpStatusOptions" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('crm.followUpDate')">
          <el-date-picker v-model="form.followUpDate" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="drawerVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveCustomer">{{ t('common.save') }}</el-button>
      </template>
    </el-drawer>
  </div>
</template>
