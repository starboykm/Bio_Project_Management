import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../crm/customer.entity';
import { KnowledgeArticle } from '../knowledge/knowledge-article.entity';
import { Project } from '../project/project.entity';
import { Task } from '../task/task.entity';

type SearchResult = {
  id: string;
  type: 'project' | 'task' | 'knowledge' | 'customer';
  title: string;
  subtitle?: string;
  path: string;
};

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(KnowledgeArticle) private readonly articles: Repository<KnowledgeArticle>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
  ) {}

  async search(query: string): Promise<SearchResult[]> {
    const keyword = query.trim().toLowerCase();
    if (keyword.length < 2) {
      return [];
    }

    const [projects, tasks, articles, customers] = await Promise.all([
      this.projects.find({ order: { updatedAt: 'DESC' }, take: 100 }),
      this.tasks.find({ order: { updatedAt: 'DESC' }, take: 100 }),
      this.articles.find({ order: { updatedAt: 'DESC' }, take: 100 }),
      this.customers.find({ order: { updatedAt: 'DESC' }, take: 100 }),
    ]);

    return [
      ...projects
        .filter((item) => this.matches(keyword, item.name, item.cropType, item.trialField, item.microbialBatch, item.latestUpdate))
        .map((item) => ({ id: item.id, type: 'project' as const, title: item.name, subtitle: item.latestUpdate, path: `/project?projectId=${item.id}` })),
      ...tasks
        .filter((item) => this.matches(keyword, item.title, item.description, item.progressNote))
        .map((item) => ({ id: item.id, type: 'task' as const, title: item.title, subtitle: item.progressNote, path: `/task?taskId=${item.id}` })),
      ...articles
        .filter((item) => this.matches(keyword, item.title, item.content, item.category, ...(item.tags || [])))
        .map((item) => ({ id: item.id, type: 'knowledge' as const, title: item.title, subtitle: item.category, path: '/knowledge' })),
      ...customers
        .filter((item) => this.matches(keyword, item.name, item.region, item.contactName, item.followUpNote))
        .map((item) => ({ id: item.id, type: 'customer' as const, title: item.name, subtitle: item.contactName, path: '/crm' })),
    ].slice(0, 20);
  }

  private matches(keyword: string, ...values: Array<string | undefined>) {
    return values.filter(Boolean).some((value) => value!.toLowerCase().includes(keyword));
  }
}
