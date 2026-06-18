import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { hasPermission } from '../common/permissions';
import { User } from '../user/user.entity';
import { CreateKnowledgeDto } from './dto/create-knowledge.dto';
import { UpdateKnowledgeDto } from './dto/update-knowledge.dto';
import { KnowledgeArticle } from './knowledge-article.entity';
import { KnowledgeCategory } from './knowledge-category.entity';
import { KnowledgeTag } from './knowledge-tag.entity';

@Injectable()
export class KnowledgeService {
  constructor(
    @InjectRepository(KnowledgeArticle) private readonly articles: Repository<KnowledgeArticle>,
    @InjectRepository(KnowledgeCategory) private readonly categories: Repository<KnowledgeCategory>,
    @InjectRepository(KnowledgeTag) private readonly tags: Repository<KnowledgeTag>,
  ) {}

  async findAll(user: User, query?: string) {
    const articles = await this.articles.find({
      where: query ? [{ title: ILike(`%${query}%`) }, { content: ILike(`%${query}%`) }] : {},
      order: { updatedAt: 'DESC' },
    });
    if (hasPermission(user, 'knowledge:manage')) {
      return articles;
    }
    return articles.filter((article) => this.canReadArticle(user, article));
  }

  async findOne(id: string, user: User) {
    const article = await this.getArticleOrThrow(id);
    if (!this.canReadArticle(user, article)) {
      throw new ForbiddenException('No knowledge access');
    }
    return article;
  }

  findCategories() {
    return this.categories.find({ order: { updatedAt: 'DESC' } });
  }

  createCategory(dto: { name: string; description?: string }, creatorId?: string) {
    return this.categories.save(this.categories.create({ ...dto, creatorId }));
  }

  async updateCategory(id: string, dto: { name?: string; description?: string }) {
    const category = await this.categories.preload({ id, ...dto });
    if (!category) {
      throw new NotFoundException('Knowledge category not found');
    }
    return this.categories.save(category);
  }

  async removeCategory(id: string) {
    const category = await this.categories.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Knowledge category not found');
    }
    await this.articles.update({ category: category.name }, { category: undefined });
    await this.categories.delete(id);
    return { deleted: true, id };
  }

  findTags() {
    return this.tags.find({ order: { name: 'ASC' } });
  }

  async createTag(dto: { name: string; color?: string }) {
    return this.ensureTag(dto.name, dto.color);
  }

  async updateTag(id: string, dto: { name?: string; color?: string }) {
    const tag = await this.tags.preload({ id, ...dto });
    if (!tag) {
      throw new NotFoundException('Knowledge tag not found');
    }
    return this.tags.save(tag);
  }

  async removeTag(id: string) {
    const tag = await this.tags.findOne({ where: { id } });
    if (!tag) {
      throw new NotFoundException('Knowledge tag not found');
    }
    const articles = await this.articles.find();
    await Promise.all(
      articles
        .filter((article) => article.tags?.includes(tag.name))
        .map((article) => {
          article.tags = article.tags.filter((item) => item !== tag.name);
          return this.articles.save(article);
        }),
    );
    await this.tags.delete(id);
    return { deleted: true, id };
  }

  async create(dto: CreateKnowledgeDto, file?: Express.Multer.File, authorId?: string) {
    await this.ensureTags(dto.tags || []);
    return this.articles.save(
      this.articles.create({
        ...dto,
        tags: dto.tags || [],
        collaboratorIds: dto.collaboratorIds || [],
        permissionMode: dto.permissionMode || 'readonly',
        editorMode: dto.editorMode || 'rich',
        richContent: dto.richContent || dto.content,
        markdownContent: dto.markdownContent || '',
        authorId,
        attachmentName: file?.originalname,
        attachmentPath: file?.path,
      }),
    );
  }

  async update(id: string, dto: UpdateKnowledgeDto, user: User) {
    const current = await this.getArticleOrThrow(id);
    if (!this.canEditArticle(user, current)) {
      throw new ForbiddenException('No knowledge edit access');
    }
    const article = await this.articles.preload({
      id,
      ...dto,
      tags: dto.tags ?? current.tags,
      collaboratorIds: dto.collaboratorIds ?? current.collaboratorIds,
    });
    if (!article) {
      throw new NotFoundException('Knowledge article not found');
    }
    await this.ensureTags(article.tags || []);
    return this.articles.save(article);
  }

  uploadedFile(file: Express.Multer.File) {
    return {
      name: file.originalname,
      url: `/uploads/${file.filename}`,
      type: file.mimetype,
    };
  }

  private async getArticleOrThrow(id: string) {
    const article = await this.articles.findOne({ where: { id } });
    if (!article) {
      throw new NotFoundException('Knowledge article not found');
    }
    return article;
  }

  private async ensureTags(tags: string[]) {
    await Promise.all(tags.map((tag) => this.ensureTag(tag)));
  }

  private async ensureTag(name: string, color?: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new NotFoundException('Knowledge tag name is required');
    }
    const existing = await this.tags.findOne({ where: { name: trimmed } });
    if (existing) {
      if (color !== undefined && existing.color !== color) {
        existing.color = color;
        return this.tags.save(existing);
      }
      return existing;
    }
    return this.tags.save(this.tags.create({ name: trimmed, color }));
  }

  private canReadArticle(user: User, article: KnowledgeArticle) {
    return article.permissionMode === 'share' || article.authorId === user.id || article.collaboratorIds?.includes(user.id) || hasPermission(user, 'knowledge:read');
  }

  private canEditArticle(user: User, article: KnowledgeArticle) {
    if (hasPermission(user, 'knowledge:manage') || article.authorId === user.id) {
      return true;
    }
    return ['editable', 'collab'].includes(article.permissionMode) && article.collaboratorIds?.includes(user.id);
  }
}
