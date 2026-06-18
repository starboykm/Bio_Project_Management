import { ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTranslationDto } from './dto/create-translation.dto';
import { UpdateTranslationDto } from './dto/update-translation.dto';
import { Translation } from './translation.entity';

const DEFAULT_TRANSLATIONS: CreateTranslationDto[] = [
  { key: 'nav.dashboard', zh: '仪表盘', en: 'Dashboard', module: 'navigation' },
  { key: 'nav.project', zh: '项目', en: 'Projects', module: 'navigation' },
  { key: 'nav.task', zh: '任务', en: 'Tasks', module: 'navigation' },
  { key: 'nav.knowledge', zh: '知识库', en: 'Knowledge', module: 'navigation' },
  { key: 'nav.crm', zh: 'CRM', en: 'CRM', module: 'navigation' },
  { key: 'nav.report', zh: '报表', en: 'Reports', module: 'navigation' },
  { key: 'nav.admin', zh: '后台', en: 'Admin', module: 'navigation' },
  { key: 'app.subtitle', zh: '生物有机菌肥', en: 'Bio-organic Fertilizer', module: 'common' },

  { key: 'common.search', zh: '搜索项目、客户、知识条目', en: 'Search projects, customers, knowledge', module: 'common' },
  { key: 'common.notifications', zh: '站内通知', en: 'Notifications', module: 'common' },
  { key: 'common.noNotifications', zh: '暂无通知', en: 'No notifications', module: 'common' },
  { key: 'common.logout', zh: '退出登录', en: 'Log out', module: 'common' },
  { key: 'common.profile', zh: '个人资料', en: 'Profile', module: 'common' },
  { key: 'common.cancel', zh: '取消', en: 'Cancel', module: 'common' },
  { key: 'common.save', zh: '保存', en: 'Save', module: 'common' },
  { key: 'common.saveSuccess', zh: '保存成功', en: 'Saved', module: 'common' },
  { key: 'common.saveFailed', zh: '保存失败', en: 'Save failed', module: 'common' },
  { key: 'common.edit', zh: '编辑', en: 'Edit', module: 'common' },
  { key: 'common.delete', zh: '删除', en: 'Delete', module: 'common' },
  { key: 'common.create', zh: '新增', en: 'Create', module: 'common' },
  { key: 'common.submit', zh: '提交', en: 'Submit', module: 'common' },
  { key: 'common.status', zh: '状态', en: 'Status', module: 'common' },
  { key: 'common.progress', zh: '进度', en: 'Progress', module: 'common' },
  { key: 'common.owner', zh: '负责人', en: 'Owner', module: 'common' },
  { key: 'common.assignee', zh: '分配给', en: 'Assignee', module: 'common' },
  { key: 'common.language', zh: '显示语言', en: 'Display language', module: 'common' },
  { key: 'common.chinese', zh: '中文', en: 'Chinese', module: 'common' },
  { key: 'common.english', zh: '英文', en: 'English', module: 'common' },
  { key: 'common.username', zh: '用户名', en: 'Username', module: 'common' },
  { key: 'common.name', zh: '姓名', en: 'Name', module: 'common' },
  { key: 'common.email', zh: '邮箱', en: 'Email', module: 'common' },
  { key: 'common.password', zh: '密码', en: 'Password', module: 'common' },
  { key: 'common.phone', zh: '联系电话', en: 'Phone', module: 'common' },
  { key: 'common.wechat', zh: '微信/IM', en: 'WeChat/IM', module: 'common' },
  { key: 'common.department', zh: '部门', en: 'Department', module: 'common' },
  { key: 'common.title', zh: '职位', en: 'Title', module: 'common' },
  { key: 'common.enabled', zh: '启用', en: 'Enabled', module: 'common' },
  { key: 'common.disabled', zh: '停用', en: 'Disabled', module: 'common' },
  { key: 'common.role', zh: '角色', en: 'Role', module: 'common' },
  { key: 'common.roles', zh: '角色', en: 'Roles', module: 'common' },
  { key: 'common.permission', zh: '权限', en: 'Permission', module: 'common' },
  { key: 'common.permissions', zh: '权限', en: 'Permissions', module: 'common' },
  { key: 'common.operation', zh: '操作', en: 'Actions', module: 'common' },
  { key: 'common.description', zh: '说明', en: 'Description', module: 'common' },
  { key: 'common.module', zh: '模块', en: 'Module', module: 'common' },
  { key: 'common.key', zh: '关键词', en: 'Key', module: 'common' },
  { key: 'common.zh', zh: '中文', en: 'Chinese', module: 'common' },
  { key: 'common.accountStatus', zh: '账号状态', en: 'Account status', module: 'common' },
  { key: 'common.expandNav', zh: '展开导航', en: 'Expand navigation', module: 'common' },
  { key: 'common.collapseNav', zh: '收起导航', en: 'Collapse navigation', module: 'common' },
  { key: 'common.confirmDelete', zh: '确认删除吗？', en: 'Confirm deletion?', module: 'common' },
  { key: 'common.confirm', zh: '确认', en: 'Confirm', module: 'common' },
  { key: 'profile.uploadAvatar', zh: '上传头像', en: 'Upload avatar', module: 'profile' },

  { key: 'login.title', zh: '生物有机菌肥项目、知识与客户协作平台', en: 'Bio-organic Fertilizer Project, Knowledge, and CRM Platform', module: 'login' },
  { key: 'login.subtitle', zh: '集中管理试验地块、菌剂批次、施肥方案、客户跟进与技术资料。', en: 'Manage trial fields, microbial batches, fertilization plans, customer follow-up, and technical materials.', module: 'login' },
  { key: 'login.accountLogin', zh: '账号登录', en: 'Account login', module: 'login' },
  { key: 'login.submit', zh: '登录', en: 'Log in', module: 'login' },

  { key: 'dashboard.title', zh: '仪表盘', en: 'Dashboard', module: 'dashboard' },
  { key: 'dashboard.subtitle', zh: '项目进度、任务风险、客户跟进与知识沉淀的运营快照。', en: 'An operational snapshot of project progress, task risks, customer follow-up, and knowledge capture.', module: 'dashboard' },
  { key: 'dashboard.newProject', zh: '新建项目', en: 'New project', module: 'dashboard' },
  { key: 'dashboard.projectTotal', zh: '项目总数', en: 'Total projects', module: 'dashboard' },
  { key: 'dashboard.activeProjects', zh: '进行中项目', en: 'Active projects', module: 'dashboard' },
  { key: 'dashboard.taskTotal', zh: '任务总数', en: 'Total tasks', module: 'dashboard' },
  { key: 'dashboard.overdueTasks', zh: '逾期任务', en: 'Overdue tasks', module: 'dashboard' },
  { key: 'dashboard.customerCount', zh: '客户数', en: 'Customers', module: 'dashboard' },
  { key: 'dashboard.knowledgeArticles', zh: '知识条目', en: 'Knowledge articles', module: 'dashboard' },
  { key: 'dashboard.recentProjects', zh: '近期项目', en: 'Recent projects', module: 'dashboard' },
  { key: 'dashboard.riskAlerts', zh: '风险提醒', en: 'Risk alerts', module: 'dashboard' },
  { key: 'dashboard.crop', zh: '作物', en: 'Crop', module: 'dashboard' },
  { key: 'dashboard.today', zh: '今日', en: 'Today', module: 'dashboard' },
  { key: 'dashboard.thisWeek', zh: '本周', en: 'This week', module: 'dashboard' },
  { key: 'dashboard.thisMonth', zh: '本月', en: 'This month', module: 'dashboard' },
  { key: 'dashboard.riskDue', zh: '3 个试验任务接近截止日期', en: '3 trial tasks are close to their due dates', module: 'dashboard' },
  { key: 'dashboard.riskCustomer', zh: '2 个客户需要补充跟进记录', en: '2 customers need follow-up records', module: 'dashboard' },
  { key: 'dashboard.riskQuality', zh: '建议整理菌剂批次质检资料', en: 'Microbial batch QC files should be organized', module: 'dashboard' },

  { key: 'admin.title', zh: '后台管理', en: 'Admin Management', module: 'admin' },
  { key: 'admin.subtitle', zh: '管理用户、角色、模块权限、中英文对照表和用户显示语言。', en: 'Manage users, roles, module permissions, translations, and user language preferences.', module: 'admin' },
  { key: 'admin.users', zh: '用户', en: 'Users', module: 'admin' },
  { key: 'admin.roles', zh: '角色', en: 'Roles', module: 'admin' },
  { key: 'admin.translations', zh: '中英文对照表', en: 'Translations', module: 'admin' },
  { key: 'admin.addUser', zh: '新增用户', en: 'Add user', module: 'admin' },
  { key: 'admin.editUser', zh: '编辑用户', en: 'Edit user', module: 'admin' },
  { key: 'admin.addRole', zh: '新增角色', en: 'Add role', module: 'admin' },
  { key: 'admin.editRole', zh: '编辑角色', en: 'Edit role', module: 'admin' },
  { key: 'admin.addTranslation', zh: '新增词条', en: 'Add translation', module: 'admin' },
  { key: 'admin.editTranslation', zh: '编辑词条', en: 'Edit translation', module: 'admin' },
  { key: 'admin.roleCode', zh: '角色编码', en: 'Role code', module: 'admin' },
  { key: 'admin.roleName', zh: '角色名称', en: 'Role name', module: 'admin' },
  { key: 'admin.rolePermissions', zh: '角色权限', en: 'Role permissions', module: 'admin' },
  { key: 'admin.userPermissions', zh: '用户单独权限', en: 'User-specific permissions', module: 'admin' },
  { key: 'admin.translationKey', zh: '关键词', en: 'Key', module: 'admin' },

  { key: 'permission.admin', zh: '后台', en: 'Admin', module: 'permission' },
  { key: 'permission.project', zh: '项目', en: 'Projects', module: 'permission' },
  { key: 'permission.task', zh: '任务', en: 'Tasks', module: 'permission' },
  { key: 'permission.knowledge', zh: '知识库', en: 'Knowledge', module: 'permission' },
  { key: 'permission.reportNotification', zh: '报表与通知', en: 'Reports and notifications', module: 'permission' },
  { key: 'permission.adminManage', zh: '后台管理', en: 'Admin management', module: 'permission' },
  { key: 'permission.userRead', zh: '查看用户', en: 'View users', module: 'permission' },
  { key: 'permission.userWrite', zh: '编辑用户', en: 'Edit users', module: 'permission' },
  { key: 'permission.projectRead', zh: '查看项目', en: 'View projects', module: 'permission' },
  { key: 'permission.projectWrite', zh: '编辑项目', en: 'Edit projects', module: 'permission' },
  { key: 'permission.projectComment', zh: '项目批注', en: 'Project comments', module: 'permission' },
  { key: 'permission.taskRead', zh: '查看任务', en: 'View tasks', module: 'permission' },
  { key: 'permission.taskWrite', zh: '编辑任务', en: 'Edit tasks', module: 'permission' },
  { key: 'permission.knowledgeRead', zh: '查看知识库', en: 'View knowledge', module: 'permission' },
  { key: 'permission.knowledgeWrite', zh: '编辑知识库', en: 'Edit knowledge', module: 'permission' },
  { key: 'permission.crmRead', zh: '查看 CRM', en: 'View CRM', module: 'permission' },
  { key: 'permission.crmWrite', zh: '编辑 CRM', en: 'Edit CRM', module: 'permission' },
  { key: 'permission.reportRead', zh: '查看报表', en: 'View reports', module: 'permission' },
  { key: 'permission.notificationRead', zh: '查看通知', en: 'View notifications', module: 'permission' },
  { key: 'permission.notificationWrite', zh: '发送通知', en: 'Send notifications', module: 'permission' },

  { key: 'project.title', zh: '项目', en: 'Projects', module: 'project' },
  { key: 'project.subtitle', zh: '项目周期、步骤进度、负责人、参与人、批注、结果和报告统一管理。', en: 'Manage lifecycle, steps, owners, participants, comments, results, and reports.', module: 'project' },
  { key: 'project.new', zh: '新建项目', en: 'New project', module: 'project' },
  { key: 'project.edit', zh: '编辑项目', en: 'Edit project', module: 'project' },
  { key: 'project.name', zh: '项目名称', en: 'Project name', module: 'project' },
  { key: 'project.steps', zh: '项目步骤', en: 'Project steps', module: 'project' },
  { key: 'project.tasks', zh: '项目任务', en: 'Project tasks', module: 'project' },
  { key: 'project.participants', zh: '参与人', en: 'Participants', module: 'project' },
  { key: 'project.cropType', zh: '作物类型', en: 'Crop type', module: 'project' },
  { key: 'project.trialField', zh: '试验地块', en: 'Trial field', module: 'project' },
  { key: 'project.microbialBatch', zh: '菌剂批次', en: 'Microbial batch', module: 'project' },
  { key: 'project.fertilizationPlan', zh: '施肥方案', en: 'Fertilization plan', module: 'project' },
  { key: 'project.latestUpdate', zh: '最近更新', en: 'Latest update', module: 'project' },
  { key: 'project.resultSummary', zh: '结果摘要', en: 'Result summary', module: 'project' },
  { key: 'project.comments', zh: '批注与备注', en: 'Comments and notes', module: 'project' },
  { key: 'project.commentPlaceholder', zh: '记录项目进度、内容、结果或报告说明', en: 'Record progress, content, results, or report notes', module: 'project' },
  { key: 'project.updateStep', zh: '更新项目步骤', en: 'Update project step', module: 'project' },
  { key: 'project.stepNote', zh: '进度备注', en: 'Progress note', module: 'project' },
  { key: 'project.stepResult', zh: '阶段结果', en: 'Step result', module: 'project' },
  { key: 'project.stepReport', zh: '报告内容', en: 'Report content', module: 'project' },
  { key: 'project.commentType.comment', zh: '批注', en: 'Comment', module: 'project' },
  { key: 'project.commentType.note', zh: '备注', en: 'Note', module: 'project' },
  { key: 'project.commentType.progress', zh: '进度', en: 'Progress', module: 'project' },
  { key: 'project.commentType.result', zh: '结果', en: 'Result', module: 'project' },
  { key: 'project.commentType.report', zh: '报告', en: 'Report', module: 'project' },
  { key: 'project.step.initiation', zh: '立项与目标确认', en: 'Initiation and goal alignment', module: 'project' },
  { key: 'project.step.design', zh: '方案设计', en: 'Solution design', module: 'project' },
  { key: 'project.step.execution', zh: '执行跟进', en: 'Execution follow-up', module: 'project' },
  { key: 'project.step.evaluation', zh: '结果评估', en: 'Result evaluation', module: 'project' },

  { key: 'task.title', zh: '任务', en: 'Tasks', module: 'task' },
  { key: 'task.subtitle', zh: '任务与项目、项目步骤关联，进度更新会同步到项目进度和最近动态。', en: 'Tasks link to projects and steps; updates sync to project progress and latest activity.', module: 'task' },
  { key: 'task.new', zh: '新建任务', en: 'New task', module: 'task' },
  { key: 'task.edit', zh: '编辑任务', en: 'Edit task', module: 'task' },
  { key: 'task.name', zh: '任务标题', en: 'Task title', module: 'task' },
  { key: 'task.description', zh: '任务描述', en: 'Task description', module: 'task' },
  { key: 'task.project', zh: '关联项目', en: 'Linked project', module: 'task' },
  { key: 'task.step', zh: '关联项目步骤', en: 'Linked project step', module: 'task' },
  { key: 'task.priority', zh: '优先级', en: 'Priority', module: 'task' },
  { key: 'task.progressNote', zh: '进度内容', en: 'Progress note', module: 'task' },
  { key: 'task.dueDate', zh: '截止日期', en: 'Due date', module: 'task' },
  { key: 'task.mine', zh: '我的任务', en: 'My tasks', module: 'task' },
  { key: 'task.all', zh: '全部任务', en: 'All tasks', module: 'task' },
  { key: 'task.deleteConfirm', zh: '删除任务后，项目内的任务列表也会同步更新。', en: 'Deleting this task also updates the project task list.', module: 'task' },

  { key: 'status.planning', zh: '计划中', en: 'Planning', module: 'status' },
  { key: 'status.active', zh: '进行中', en: 'Active', module: 'status' },
  { key: 'status.paused', zh: '已暂停', en: 'Paused', module: 'status' },
  { key: 'status.completed', zh: '已完成', en: 'Completed', module: 'status' },
  { key: 'status.pending', zh: '待开始', en: 'Pending', module: 'status' },
  { key: 'status.blocked', zh: '受阻', en: 'Blocked', module: 'status' },
  { key: 'status.todo', zh: '待处理', en: 'To do', module: 'status' },
  { key: 'status.doing', zh: '进行中', en: 'Doing', module: 'status' },
  { key: 'status.review', zh: '待复核', en: 'Review', module: 'status' },
  { key: 'status.done', zh: '已完成', en: 'Done', module: 'status' },

  { key: 'priority.low', zh: '低', en: 'Low', module: 'priority' },
  { key: 'priority.medium', zh: '中', en: 'Medium', module: 'priority' },
  { key: 'priority.high', zh: '高', en: 'High', module: 'priority' },
  { key: 'priority.urgent', zh: '紧急', en: 'Urgent', module: 'priority' },

  { key: 'knowledge.title', zh: '知识库', en: 'Knowledge', module: 'knowledge' },
  { key: 'knowledge.subtitle', zh: '沉淀试验规范、产品资料、客户反馈和内部 SOP。', en: 'Capture trial standards, product materials, customer feedback, and internal SOPs.', module: 'knowledge' },
  { key: 'knowledge.new', zh: '新增条目', en: 'New article', module: 'knowledge' },
  { key: 'knowledge.articleTitle', zh: '标题', en: 'Title', module: 'knowledge' },
  { key: 'knowledge.category', zh: '分类', en: 'Category', module: 'knowledge' },
  { key: 'knowledge.tags', zh: '标签', en: 'Tags', module: 'knowledge' },

  { key: 'crm.title', zh: 'CRM', en: 'CRM', module: 'crm' },
  { key: 'crm.subtitle', zh: '记录客户、联系人、试用阶段、跟进备注与销售机会。', en: 'Track customers, contacts, trial stages, follow-up notes, and sales opportunities.', module: 'crm' },
  { key: 'crm.new', zh: '新增客户', en: 'New customer', module: 'crm' },
  { key: 'crm.customerName', zh: '客户名称', en: 'Customer name', module: 'crm' },
  { key: 'crm.region', zh: '区域', en: 'Region', module: 'crm' },
  { key: 'crm.stage', zh: '阶段', en: 'Stage', module: 'crm' },
  { key: 'crm.contactName', zh: '联系人', en: 'Contact', module: 'crm' },

  { key: 'report.title', zh: '报表', en: 'Reports', module: 'report' },
  { key: 'report.subtitle', zh: '查看项目、任务、客户与知识库的周期性经营分析。', en: 'View periodic operating analysis for projects, tasks, customers, and knowledge.', module: 'report' },
  { key: 'report.generate', zh: '生成报表', en: 'Generate report', module: 'report' },
  { key: 'report.projectHealth', zh: '项目健康度', en: 'Project health', module: 'report' },
  { key: 'report.active', zh: '进行中', en: 'Active', module: 'report' },
  { key: 'report.attention', zh: '需关注', en: 'Needs attention', module: 'report' },
  { key: 'report.completion', zh: '完成率', en: 'Completion rate', module: 'report' },
  { key: 'report.crmFunnel', zh: 'CRM 漏斗', en: 'CRM funnel', module: 'report' },
  { key: 'report.lead', zh: '线索', en: 'Lead', module: 'report' },
  { key: 'report.trial', zh: '试用', en: 'Trial', module: 'report' },
  { key: 'report.proposal', zh: '方案', en: 'Proposal', module: 'report' },
  { key: 'report.closed', zh: '成交', en: 'Closed', module: 'report' },
];

@Injectable()
export class TranslationsService implements OnModuleInit {
  constructor(@InjectRepository(Translation) private readonly translations: Repository<Translation>) {}

  async onModuleInit() {
    for (const translation of DEFAULT_TRANSLATIONS) {
      const exists = await this.translations.findOne({ where: { key: translation.key } });
      if (!exists) {
        await this.translations.save(this.translations.create(translation));
      } else if (this.looksCorrupt(exists.zh)) {
        await this.translations.update(exists.id, translation);
      }
    }
  }

  findAll() {
    return this.translations.find({ order: { module: 'ASC', key: 'ASC' } });
  }

  async create(dto: CreateTranslationDto) {
    const exists = await this.translations.findOne({ where: { key: dto.key } });
    if (exists) {
      throw new ConflictException('Translation key already exists');
    }
    return this.translations.save(this.translations.create(dto));
  }

  async update(id: string, dto: UpdateTranslationDto) {
    const translation = await this.translations.preload({ id, ...dto });
    if (!translation) {
      throw new NotFoundException('Translation not found');
    }
    return this.translations.save(translation);
  }

  private looksCorrupt(value?: string) {
    return Boolean(value && /[�鐢浠诲椤圭洰鎶ヨ〃鍚庡彴]/.test(value));
  }
}
