import { createRouter, createWebHistory } from 'vue-router';
import AdminView from './views/AdminView.vue';
import CrmView from './views/CrmView.vue';
import DashboardView from './views/DashboardView.vue';
import KnowledgeView from './views/KnowledgeView.vue';
import LoginView from './views/LoginView.vue';
import ProjectView from './views/ProjectView.vue';
import ReportView from './views/ReportView.vue';
import TaskView from './views/TaskView.vue';
import { clearSession, hasToken, isSessionExpired, markActivity } from './auth/session';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', component: LoginView, meta: { public: true } },
    { path: '/dashboard', component: DashboardView },
    { path: '/project', component: ProjectView },
    { path: '/task', component: TaskView },
    { path: '/knowledge', component: KnowledgeView },
    { path: '/crm', component: CrmView },
    { path: '/report', component: ReportView },
    { path: '/admin', component: AdminView },
  ],
});

router.beforeEach((to) => {
  if (isSessionExpired()) {
    clearSession();
    return '/login';
  }
  if (!to.meta.public && !hasToken()) {
    return '/login';
  }
  markActivity();
  return true;
});

export default router;
