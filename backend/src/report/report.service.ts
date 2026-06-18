import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../crm/customer.entity';
import { KnowledgeArticle } from '../knowledge/knowledge-article.entity';
import { Project } from '../project/project.entity';
import { Task } from '../task/task.entity';
import { Report } from './report.entity';

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
    const [projects, activeProjects, tasks, overdueTasks, customers, articles] = await Promise.all([
      this.projects.count(),
      this.projects.count({ where: { status: 'active' } }),
      this.tasks.count(),
      this.tasks
        .createQueryBuilder('task')
        .where('task.dueDate < CURRENT_DATE')
        .andWhere('task.status != :status', { status: 'done' })
        .getCount(),
      this.customers.count(),
      this.articles.count(),
    ]);

    return {
      projects,
      activeProjects,
      tasks,
      overdueTasks,
      customers,
      knowledgeArticles: articles,
    };
  }

  findAll() {
    return this.reports.find({ order: { createdAt: 'DESC' } });
  }
}
