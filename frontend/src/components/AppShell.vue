<script setup lang="ts">
import {
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Gauge,
  LogOut,
  MessageCircle,
  Search,
  Settings,
  Sprout,
  UserRound,
  Users,
} from '@lucide/vue';
import { ElMessageBox } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { http } from '../api/http';
import { clearSession } from '../auth/session';
import { i18nState, loadTranslations, setLocalLanguage, t } from '../i18n';
import MentionInput from './MentionInput.vue';

type NotificationItem = {
  id: string;
  title: string;
  content: string;
  type: string;
  relatedType?: string;
  relatedId?: string;
  isRead: boolean;
  createdAt: string;
};
type MentionOption = { id: string; name: string; label: string; email?: string };
type SearchResult = { id: string; type: string; title: string; subtitle?: string; path: string };
type CommunicationMessage = {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  recipientNames: string[];
  isUnread?: boolean;
  relatedType?: string;
  relatedId?: string;
  createdAt: string;
};
type CommunicationThread = {
  conversationKey: string;
  participantIds: string[];
  participantNames: string[];
  latestContent: string;
  latestAt: string;
  unreadCount: number;
};
type CurrentUser = {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  wechat?: string;
  avatarUrl?: string;
  language?: 'zh' | 'en';
};

const route = useRoute();
const router = useRouter();
const collapsed = ref(false);
const notificationVisible = ref(false);
const messageVisible = ref(false);
const profileVisible = ref(false);
const notifications = ref<NotificationItem[]>([]);
const messages = ref<CommunicationMessage[]>([]);
const messageThreads = ref<CommunicationThread[]>([]);
const mentionOptions = ref<MentionOption[]>([]);
const messageContent = ref('');
const activeConversationKey = ref('');
const selectedRecipientIds = ref<string[]>([]);
const searchQuery = ref('');
const searchResults = ref<SearchResult[]>([]);
const searchOpen = ref(false);
const currentUser = ref<CurrentUser>(JSON.parse(localStorage.getItem('currentUser') || '{"name":"Admin"}'));
const profileForm = reactive<CurrentUser>({ ...currentUser.value });
const unreadCount = computed(() => notifications.value.filter((item) => !item.isRead).length);
const messageUnreadCount = computed(() => messageThreads.value.reduce((sum, item) => sum + item.unreadCount, 0));
const memberOptions = computed(() => mentionOptions.value.filter((item) => item.id !== 'all'));

const modules = [
  { path: '/dashboard', labelKey: 'nav.dashboard', icon: Gauge },
  { path: '/project', labelKey: 'nav.project', icon: Building2 },
  { path: '/task', labelKey: 'nav.task', icon: CheckSquare },
  { path: '/knowledge', labelKey: 'nav.knowledge', icon: BookOpen },
  { path: '/crm', labelKey: 'nav.crm', icon: Users },
  { path: '/report', labelKey: 'nav.report', icon: BarChart3 },
  { path: '/admin', labelKey: 'nav.admin', icon: Settings },
];

async function loadNotifications() {
  try {
    const { data } = await http.get('/notifications');
    notifications.value = data;
  } catch {
    notifications.value = [];
  }
}

async function loadMentionOptions() {
  const { data } = await http.get('/communications/mentions');
  mentionOptions.value = data;
}

async function loadMessages() {
  const { data } = await http.get('/communications', { params: activeConversationKey.value ? { conversationKey: activeConversationKey.value } : {} });
  messages.value = data;
}

async function loadMessageThreads() {
  const { data } = await http.get('/communications/threads');
  messageThreads.value = data;
  if (!activeConversationKey.value && data.length) {
    await openThread(data[0]);
  }
}

let searchTimer: number | undefined;
function searchAll() {
  if (searchTimer) window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(async () => {
    if (searchQuery.value.trim().length < 2) {
      searchResults.value = [];
      searchOpen.value = false;
      return;
    }
    const { data } = await http.get('/search', { params: { q: searchQuery.value } });
    searchResults.value = data;
    searchOpen.value = true;
  }, 220);
}

function openSearchResult(item: SearchResult) {
  searchOpen.value = false;
  searchQuery.value = '';
  router.push(item.path);
}

async function markRead(item: NotificationItem) {
  if (!item.isRead) {
    await http.patch(`/notifications/${item.id}/read`);
    item.isRead = true;
  }
  if (item.relatedType === 'project' && item.relatedId) {
    notificationVisible.value = false;
    router.push(`/project?projectId=${item.relatedId}`);
  } else if (item.relatedType === 'task' && item.relatedId) {
    notificationVisible.value = false;
    router.push(`/task?taskId=${item.relatedId}`);
  }
}

async function markUnread(item: NotificationItem) {
  await http.patch(`/notifications/${item.id}/unread`);
  item.isRead = false;
}

async function markAllNotificationsRead() {
  await http.patch('/notifications/read-all');
  await loadNotifications();
}

async function openThread(thread: CommunicationThread) {
  activeConversationKey.value = thread.conversationKey;
  selectedRecipientIds.value = thread.participantIds.filter((id) => id !== currentUser.value.id);
  await loadMessages();
  await http.patch(`/communications/threads/${encodeURIComponent(thread.conversationKey)}/read`);
  await loadMessageThreads();
}

function startNewThread() {
  activeConversationKey.value = '';
  selectedRecipientIds.value = [];
  messages.value = [];
  messageContent.value = '';
}

function openProfile() {
  Object.assign(profileForm, currentUser.value);
  profileVisible.value = true;
}

async function saveProfile() {
  const { data } = await http.patch('/users/me', profileForm);
  currentUser.value = data;
  localStorage.setItem('currentUser', JSON.stringify(data));
  setLocalLanguage(data.language || 'zh');
  profileVisible.value = false;
}

async function uploadAvatar(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const form = new FormData();
  form.append('file', file);
  const { data } = await http.post('/users/me/avatar', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  currentUser.value = data;
  Object.assign(profileForm, data);
  localStorage.setItem('currentUser', JSON.stringify(data));
}

async function changeLanguage(language: 'zh' | 'en') {
  setLocalLanguage(language);
  profileForm.language = language;
  if (currentUser.value.id) {
    const { data } = await http.patch('/users/me', { language });
    currentUser.value = data;
    localStorage.setItem('currentUser', JSON.stringify(data));
  }
}

function logout() {
  clearSession();
  router.push('/login');
}

async function sendMessage() {
  if (!messageContent.value.trim()) return;
  const { data } = await http.post('/communications', {
    content: messageContent.value,
    conversationKey: activeConversationKey.value || undefined,
    recipientIds: selectedRecipientIds.value,
  });
  activeConversationKey.value = data.conversationKey || activeConversationKey.value;
  messageContent.value = '';
  await Promise.all([loadMessages(), loadMessageThreads(), loadNotifications()]);
}

async function deleteMessage(item: CommunicationMessage) {
  try {
    await ElMessageBox.confirm(t('communication.deleteConfirm'), t('common.confirm'), { type: 'warning' });
  } catch {
    return;
  }
  await http.delete(`/communications/${item.id}`);
  await Promise.all([loadMessages(), loadMessageThreads()]);
}

onMounted(async () => {
  setLocalLanguage(currentUser.value.language || i18nState.language);
  await loadTranslations();
  await Promise.all([loadNotifications(), loadMentionOptions(), loadMessageThreads()]);
});
</script>

<template>
  <div class="workspace" :class="{ collapsed }">
    <aside class="workspace-sidebar">
      <div class="workspace-title">
        <div class="brand-mark">
          <Sprout :size="22" />
        </div>
        <div v-if="!collapsed" class="brand-copy">
          <strong>Bio PM</strong>
          <span>{{ t('app.subtitle') }}</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <button
          v-for="item in modules"
          :key="item.path"
          class="channel-item"
          :class="{ active: route.path === item.path }"
          :title="t(item.labelKey)"
          @click="router.push(item.path)"
        >
          <component :is="item.icon" :size="19" />
          <span v-if="!collapsed">{{ t(item.labelKey) }}</span>
        </button>
      </nav>

      <button class="collapse-button" :title="collapsed ? t('common.expandNav') : t('common.collapseNav')" @click="collapsed = !collapsed">
        <ChevronRight v-if="collapsed" :size="18" />
        <ChevronLeft v-else :size="18" />
      </button>
    </aside>

    <main class="content-shell">
      <header class="topbar">
        <div class="search-box">
          <Search :size="17" />
          <input v-model="searchQuery" :placeholder="t('common.search')" @input="searchAll" @focus="searchOpen = searchResults.length > 0" />
          <div v-if="searchOpen" class="search-results">
            <button v-for="item in searchResults" :key="`${item.type}-${item.id}`" class="search-result-item" @click="openSearchResult(item)">
              <strong>{{ item.title }}</strong>
              <span>{{ item.type }} · {{ item.subtitle || item.path }}</span>
            </button>
            <div v-if="!searchResults.length" class="empty-state">{{ t('search.noResults') }}</div>
          </div>
        </div>
        <div class="user-block">
          <el-select
            :model-value="i18nState.language"
            size="small"
            style="width: 92px"
            @change="(value: 'zh' | 'en') => changeLanguage(value)"
          >
            <el-option :label="t('common.chinese')" value="zh" />
            <el-option :label="t('common.english')" value="en" />
          </el-select>
          <button class="icon-button notification-button" :title="t('common.notifications')" @click="notificationVisible = true">
            <Bell :size="18" />
            <span v-if="unreadCount" class="notification-dot">{{ unreadCount }}</span>
          </button>
          <button class="icon-button notification-button" :title="t('communication.title')" @click="messageVisible = true">
            <MessageCircle :size="18" />
            <span v-if="messageUnreadCount" class="notification-dot">{{ messageUnreadCount }}</span>
          </button>
          <el-dropdown trigger="click">
            <button class="user-menu-button">
              <img v-if="currentUser.avatarUrl" :src="currentUser.avatarUrl" alt="" />
              <UserRound v-else :size="18" />
              <span>{{ currentUser.name }}</span>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="openProfile">{{ t('common.profile') }}</el-dropdown-item>
                <el-dropdown-item divided @click="logout">{{ t('common.logout') }}</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <button class="icon-button" :title="t('common.logout')" @click="logout">
            <LogOut :size="18" />
          </button>
        </div>
      </header>
      <section class="content-panel">
        <slot />
      </section>
    </main>

    <el-drawer v-model="notificationVisible" :title="t('common.notifications')" size="380px" @open="loadNotifications">
      <div class="drawer-toolbar">
        <el-button size="small" @click="markAllNotificationsRead">{{ t('notification.markAllRead') }}</el-button>
      </div>
      <div v-if="!notifications.length" class="empty-state">{{ t('common.noNotifications') }}</div>
      <div
        v-for="item in notifications"
        :key="item.id"
        class="notification-item"
        :class="{ unread: !item.isRead }"
        @click="markRead(item)"
      >
        <strong>{{ item.title }}</strong>
        <p>{{ item.content }}</p>
        <div class="notification-meta">
          <span>{{ new Date(item.createdAt).toLocaleString() }}</span>
          <el-button size="small" link @click.stop="item.isRead ? markUnread(item) : markRead(item)">
            {{ item.isRead ? t('notification.markUnread') : t('notification.markRead') }}
          </el-button>
        </div>
      </div>
    </el-drawer>

    <el-drawer v-model="messageVisible" :title="t('communication.title')" size="720px" @open="loadMessageThreads">
      <div class="chat-layout">
        <aside class="chat-thread-list">
          <button class="chat-new-button" type="button" @click="startNewThread">{{ t('communication.newThread') }}</button>
          <button
            v-for="thread in messageThreads"
            :key="thread.conversationKey"
            type="button"
            class="chat-thread-item"
            :class="{ active: thread.conversationKey === activeConversationKey }"
            @click="openThread(thread)"
          >
            <strong>{{ thread.participantNames.join('、') }}</strong>
            <span>{{ thread.latestContent }}</span>
            <em v-if="thread.unreadCount">{{ thread.unreadCount }}</em>
          </button>
        </aside>
        <section class="chat-panel">
          <el-select v-model="selectedRecipientIds" multiple filterable :placeholder="t('communication.recipients')" style="width: 100%; margin-bottom: 10px">
            <el-option v-for="member in memberOptions" :key="member.id" :label="member.name" :value="member.id" />
          </el-select>
          <div v-if="!messages.length" class="empty-state">{{ t('communication.empty') }}</div>
          <div v-else class="chat-messages">
            <div v-for="item in messages" :key="item.id" class="chat-message" :class="{ mine: item.senderId === currentUser.id, unread: item.isUnread }">
              <div class="message-item-header">
                <strong>{{ item.senderName }}</strong>
                <span>{{ new Date(item.createdAt).toLocaleString() }}</span>
              </div>
              <p>{{ item.content }}</p>
              <div class="message-item-actions">
                <span>{{ item.recipientNames.join('、') || t('communication.onlyMe') }}</span>
                <el-button size="small" type="danger" plain @click="deleteMessage(item)">{{ t('common.delete') }}</el-button>
              </div>
            </div>
          </div>
          <MentionInput v-model="messageContent" :options="mentionOptions" :placeholder="t('communication.replyPlaceholder')" :rows="4" @submit="sendMessage" />
          <span class="chat-hint">{{ t('communication.ctrlEnter') }}</span>
        </section>
      </div>
      <template #footer>
        <el-button @click="messageVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="sendMessage">{{ t('communication.send') }}</el-button>
      </template>
    </el-drawer>

    <el-drawer v-model="profileVisible" :title="t('common.profile')" size="420px">
      <div class="profile-avatar">
        <img v-if="profileForm.avatarUrl" :src="profileForm.avatarUrl" alt="" />
        <UserRound v-else :size="40" />
        <label class="upload-button">
          {{ t('profile.uploadAvatar') }}
          <input type="file" accept="image/*" @change="uploadAvatar" />
        </label>
      </div>
      <el-form :model="profileForm" label-position="top">
        <el-form-item :label="t('common.username')"><el-input v-model="profileForm.name" /></el-form-item>
        <el-form-item :label="t('common.email')"><el-input v-model="profileForm.email" disabled /></el-form-item>
        <el-form-item :label="t('common.phone')"><el-input v-model="profileForm.phone" /></el-form-item>
        <el-form-item :label="t('common.wechat')"><el-input v-model="profileForm.wechat" /></el-form-item>
        <el-form-item :label="t('common.language')">
          <el-select v-model="profileForm.language" style="width: 100%" @change="(value: 'zh' | 'en') => changeLanguage(value)">
            <el-option :label="t('common.chinese')" value="zh" />
            <el-option :label="t('common.english')" value="en" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="profileVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveProfile">{{ t('common.save') }}</el-button>
      </template>
    </el-drawer>
  </div>
</template>
