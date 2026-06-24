import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../crm/customer.entity';
import { KnowledgeArticle } from '../knowledge/knowledge-article.entity';
import { Project } from '../project/project.entity';
import { Task } from '../task/task.entity';
import { Report } from './report.entity';

type CountMap = Record<string, number>;

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Report) private readonly reports: Repository<Report>,
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(KnowledgeArticle) private readonly articles: Repository<KnowledgeArticle>,
  ) {}

  async dashboard() {
    const snapshot = await this.buildOperationsSnapshot();

    return {
      projects: snapshot.projectHealth.total,
      activeProjects: snapshot.projectHealth.active,
      tasks: snapshot.taskHealth.total,
      overdueTasks: snapshot.taskHealth.overdue,
      customers: snapshot.crm.total,
      knowledgeArticles: snapshot.knowledge.articles,
      recentProjects: snapshot.recentProjects,
      riskAlerts: snapshot.riskAlerts,
      dueTasks: snapshot.overdueTasks,
      upcomingFollowUps: snapshot.crm.upcomingFollowUps,
    };
  }

  async operations() {
    return this.buildOperationsSnapshot();
  }

  async generateOperationsReport() {
    const payload = await this.buildOperationsSnapshot();
    return this.reports.save(
      this.reports.create({
        title: `运营报表 ${new Date().toISOString().slice(0, 10)}`,
        type: 'operations',
        payload,
      }),
    );
  }

  findAll() {
    return this.reports.find({ order: { createdAt: 'DESC' } });
  }

  private async buildOperationsSnapshot() {
    const [projects, tasks, customers, articles] = await Promise.all([
      this.projects.find({ order: { updatedAt: 'DESC' } }),
      this.tasks.find({ order: { updatedAt: 'DESC' } }),
      this.customers.find({ order: { updatedAt: 'DESC' } }),
      this.articles.find({ order: { updatedAt: 'DESC' } }),
    ]);
    const today = this.dateOnly(new Date());
    const weekEnd = this.addDays(today, 7);
    const overdueTasks = tasks.filter((task) => this.isOverdue(task, today));
    const dueSoonTasks = tasks.filter((task) => task.status !== 'done' && task.dueDate && task.dueDate >= today && task.dueDate <= weekEnd);
    const activeProjects = projects.filter((project) => project.status === 'active');
    const attentionProjects = projects.filter(
      (project) =>
        project.status === 'paused' ||
        (project.status === 'active' && (project.progress || 0) < 30) ||
        tasks.some((task) => task.projectId === project.id && this.isOverdue(task, today)),
    );
    const averageProgress = projects.length
      ? Math.round(projects.reduce((sum, project) => sum + (project.progress || 0), 0) / projects.length)
      : 0;
    const completedProjects = projects.filter((project) => project.status === 'completed').length;
    const upcomingFollowUps = customers
      .filter((customer) => customer.nextFollowUpDate && customer.nextFollowUpDate >= today && customer.nextFollowUpDate <= weekEnd)
      .map((customer) => this.customerRow(customer))
      .slice(0, 8);
    const customerProjects = projects
      .filter((project) => project.type === 'customer')
      .map((project) => ({
        ...this.projectRow(project),
        customerName: customers.find((customer) => customer.id === project.customerId)?.name || '',
      }))
      .slice(0, 8);

    return {
      generatedAt: new Date().toISOString(),
      projectHealth: {
        total: projects.length,
        active: activeProjects.length,
        completed: completedProjects,
        attention: attentionProjects.length,
        completionRate: projects.length ? Math.round((completedProjects / projects.length) * 100) : 0,
        averageProgress,
        byStatus: this.countBy(projects, 'status'),
        byType: this.countBy(projects, 'type'),
      },
      taskHealth: {
        total: tasks.length,
        overdue: overdueTasks.length,
        dueSoon: dueSoonTasks.length,
        done: tasks.filter((task) => task.status === 'done').length,
        recurring: tasks.filter((task) => task.recurrenceType && task.recurrenceType !== 'none').length,
        byStatus: this.countBy(tasks, 'status'),
      },
      crm: {
        total: customers.length,
        byStage: this.countBy(customers, 'stage'),
        followUpStatus: this.countBy(customers, 'followUpStatus'),
        pendingFollowUps: customers.filter((customer) => customer.followUpStatus === 'pending').length,
        cooperated: customers.filter((customer) => customer.followUpStatus === 'cooperated' || customer.stage === 'won').length,
        upcomingFollowUps,
      },
      knowledge: {
        articles: articles.length,
        withAttachments: articles.filter((article) => (article.attachments?.length || 0) > 0 || article.attachmentPath).length,
      },
      recentProjects: projects.slice(0, 8).map((project) => this.projectRow(project)),
      overdueTasks: overdueTasks.slice(0, 8).map((task) => this.taskRow(task, projects)),
      dueSoonTasks: dueSoonTasks.slice(0, 8).map((task) => this.taskRow(task, projects)),
      customerProjects,
      riskAlerts: this.buildRiskAlerts(overdueTasks, dueSoonTasks, attentionProjects, upcomingFollowUps),
    };
  }

  private buildRiskAlerts(overdueTasks: Task[], dueSoonTasks: Task[], attentionProjects: Project[], upcomingFollowUps: Array<Record<string, unknown>>) {
    const alerts: Array<{ level: 'danger' | 'warning' | 'info'; title: string; content: string; relatedType?: string; relatedId?: string }> = [];
    if (overdueTasks.length) {
      alerts.push({
        level: 'danger',
        title: '任务逾期',
        content: `${overdueTasks.length} 个任务已逾期，需要尽快处理。`,
        relatedType: 'task',
        relatedId: overdueTasks[0].id,
      });
    }
    if (attentionProjects.length) {
      alerts.push({
        level: 'warning',
        title: '项目需关注',
        content: `${attentionProjects.length} 个项目处于暂停、低进度或含逾期任务状态。`,
        relatedType: 'project',
        relatedId: attentionProjects[0].id,
      });
    }
    if (dueSoonTasks.length) {
      alerts.push({
        level: 'info',
        title: '近期任务',
        content: `${dueSoonTasks.length} 个任务将在 7 天内到期。`,
        relatedType: 'task',
        relatedId: dueSoonTasks[0].id,
      });
    }
    if (upcomingFollowUps.length) {
      alerts.push({
        level: 'info',
        title: '客户跟进',
        content: `${upcomingFollowUps.length} 个客户需要在 7 天内跟进。`,
        relatedType: 'crm',
        relatedId: upcomingFollowUps[0].id as string,
      });
    }
    return alerts;
  }

  private countBy<T extends object>(items: T[], key: keyof T & string): CountMap {
    return items.reduce((acc, item) => {
      const value = String((item as Record<string, unknown>)[key] || 'unknown');
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as CountMap);
  }

  private projectRow(project: Project) {
    return {
      id: project.id,
      name: project.name,
      status: project.status,
      type: project.type,
      cropType: project.cropType,
      ownerId: project.ownerId,
      progress: project.progress || 0,
      updatedAt: project.updatedAt,
    };
  }

  private taskRow(task: Task, projects: Project[]) {
    const project = task.projectId ? projects.find((item) => item.id === task.projectId) : undefined;
    return {
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      assigneeId: task.assigneeId,
      progress: task.progress || 0,
      projectId: task.projectId,
      projectName: project?.name || '',
    };
  }

  private customerRow(customer: Customer) {
    return {
      id: customer.id,
      name: customer.name,
      stage: customer.stage,
      followUpStatus: customer.followUpStatus,
      trackingUserId: customer.trackingUserId || customer.ownerId,
      nextFollowUpDate: customer.nextFollowUpDate,
    };
  }

  private isOverdue(task: Task, today: string) {
    return Boolean(task.dueDate && task.dueDate < today && task.status !== 'done');
  }

  private dateOnly(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private addDays(date: string, days: number) {
    const next = new Date(`${date}T00:00:00.000Z`);
    next.setUTCDate(next.getUTCDate() + days);
    return this.dateOnly(next);
  }
}
