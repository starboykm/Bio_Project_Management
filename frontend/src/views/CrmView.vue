<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { http } from '../api/http';
import { t } from '../i18n';

type UserOption = { id: string; name: string; email: string };
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
  followUpNote?: string;
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
  followUpNote: '',
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
const fixedCustomerKeys = new Set([
  'id',
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
  'followUpNote',
  'customData',
]);

function userName(id?: string) {
  return users.value.find((user) => user.id === id)?.name || '-';
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
    followUpNote: '',
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
  Object.assign(form, { ...row, trackingUserId: row.trackingUserId || row.ownerId || '' });
  drawerVisible.value = true;
}

async function selectCustomer(row: Customer) {
  if (!row.id) return;
  const { data } = await http.get(`/crm/customers/${row.id}`);
  selected.value = mergeCustomData(data);
}

async function saveCustomer() {
  const payload: Customer = { ownerId: form.ownerId || form.trackingUserId } as Customer;
  const customData: Record<string, unknown> = {};
  Object.entries(form).forEach(([key, value]) => {
    if (fixedCustomerKeys.has(key)) {
      payload[key] = value;
    } else {
      customData[key] = value;
    }
  });
  payload.customData = { ...(form.customData || {}), ...customData };
  if (editingId.value) {
    await http.patch(`/crm/customers/${editingId.value}`, payload);
  } else {
    const { data } = await http.post('/crm/customers', payload);
    selected.value = data;
  }
  drawerVisible.value = false;
  await loadCustomers();
  ElMessage.success(t('common.saveSuccess'));
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
        </el-table>
      </div>

      <div v-if="selected" class="work-panel">
        <div class="detail-header">
          <div>
            <h2>{{ selected.name }}</h2>
            <p>{{ selected.region || '-' }} · {{ t(`crm.stage.${selected.stage}`) }} · {{ userName(selected.trackingUserId || selected.ownerId) }}</p>
          </div>
          <el-button type="primary" @click="openEdit(selected)">{{ t('common.edit') }}</el-button>
        </div>
        <el-descriptions :column="2" border>
          <el-descriptions-item v-for="field in formFields" :key="field.key" :label="field.label" :span="field.type === 'textarea' ? 2 : 1">
            <template v-if="field.type === 'user'">{{ userName(selected[field.key] as string) }}</template>
            <template v-else-if="field.key === 'stage'">{{ t(`crm.stage.${selected[field.key] || 'lead'}`) }}</template>
            <template v-else>{{ selected[field.key] || '-' }}</template>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </section>

    <el-drawer v-model="drawerVisible" :title="drawerTitle" size="620px">
      <el-form :model="form" label-position="top">
        <el-form-item v-for="field in formFields" :key="field.key" :label="field.label" :required="field.required">
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
      </el-form>
      <template #footer>
        <el-button @click="drawerVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveCustomer">{{ t('common.save') }}</el-button>
      </template>
    </el-drawer>
  </div>
</template>
