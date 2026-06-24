import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommunicationService } from '../communication/communication.service';
import { hasPermission } from '../common/permissions';
import { NotificationsService } from '../notification/notifications.service';
import { Task } from '../task/task.entity';
import { User } from '../user/user.entity';
import { CreateProjectCommentDto } from './dto/create-project-comment.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectStepDto } from './dto/update-project-step.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectComment } from './project-comment.entity';
import { ProjectStep } from './project-step.entity';
import { Project } from './project.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(ProjectStep) private readonly steps: Repository<ProjectStep>,
    @InjectRepository(ProjectComment) private readonly comments: Repository<ProjectComment>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    private readonly notifications: NotificationsService,
    private readonly communication: CommunicationService,
  ) {}

  async findAll(user: User) {
    const projects = await this.projects.find({ order: { updatedAt: 'DESC' } });
    await Promise.all(projects.map((project) => this.recalculateProjectProgress(project.id)));
    const refreshedProjects = await this.projects.find({ order: { updatedAt: 'DESC' } });
    if (hasPermission(user, 'admin:manage') || hasPermission(user, 'project:write')) {
      return refreshedProjects;
    }

    return refreshedProjects.filter((project) => this.canReadProject(user, project));
  }

  async findOne(id: string, user: User) {
    const project = await this.getProjectOrThrow(id);
    this.assertCanRead(user, project);
    const [comments] = await Promise.all([
      this.comments.find({ where: { projectId: id }, order: { createdAt: 'DESC' } }),
      this.recalculateProjectProgress(id),
    ]);
    const refreshed = await this.getProjectOrThrow(id);
    return { ...refreshed, comments };
  }

  async create(dto: CreateProjectDto, user: User) {
    const { steps = [], ...projectDto } = dto;
    const project = await this.projects.save(
      this.projects.create({
        ...projectDto,
        ownerId: dto.ownerId || user.id,
        participantIds: Array.from(new Set([...(dto.participantIds || []), user.id])),
      }),
    );

    if (steps.length) {
      await this.steps.save(
        steps.map((step, index) =>
          this.steps.create({
            projectId: project.id,
            title: step.title,
            description: step.description,
            assigneeId: step.assigneeId,
            dueDate: step.dueDate,
            orderIndex: index,
            status: index === 0 ? 'active' : 'pending',
          }),
        ),
      );
    }

    await this.notifyProjectMembers(project, '新项目已创建', `项目「${project.name}」已创建。`, user.id);
    return this.findOne(project.id, user);
  }

  async update(id: string, dto: UpdateProjectDto, user: User) {
    const current = await this.getProjectOrThrow(id);
    this.assertCanWrite(user, current);

    const project = await this.projects.preload({ id, ...dto });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    const saved = await this.projects.save(project);
    await this.notifyProjectMembers(saved, '项目内容已更新', `项目「${saved.name}」内容有新的更新。`, user.id);
    return saved;
  }

  uploadContract(file: Express.Multer.File) {
    return {
      name: file.originalname,
      url: `/uploads/${file.filename}`,
    };
  }

  async remove(id: string, user: User) {
    const project = await this.getProjectOrThrow(id);
    this.assertCanWrite(user, project);
    await Promise.all([this.comments.delete({ projectId: id }), this.steps.delete({ projectId: id }), this.tasks.delete({ projectId: id })]);
    await this.projects.delete(id);
    await this.notifyProjectMembers(project, '项目已删除', `项目「${project.name}」已被删除。`, user.id);
    return { deleted: true, id };
  }

  async updateStep(projectId: string, stepId: string, dto: UpdateProjectStepDto, user: User) {
    const project = await this.getProjectOrThrow(projectId);
    await this.assertCanWriteProjectOrAssignedStep(user, project, stepId);

    const step = await this.steps.preload({ id: stepId, projectId, ...dto });
    if (!step) {
      throw new NotFoundException('Project step not found');
    }

    if (dto.status === 'done' && dto.progress === undefined) {
      step.progress = 100;
    }

    const saved = await this.steps.save(step);
    const progress = await this.recalculateProjectProgress(projectId);
    await this.projects.update(projectId, {
      progress,
      latestUpdate: dto.note || dto.result || dto.report || `步骤「${saved.title}」已更新`,
      resultSummary: dto.result,
      reportContent: dto.report,
    });
    await this.notifyProjectMembers(project, '项目步骤已更新', `步骤「${saved.title}」进度更新为 ${saved.progress}%。`, user.id);
    return saved;
  }

  async addComment(projectId: string, dto: CreateProjectCommentDto, user: User) {
    const project = await this.getProjectOrThrow(projectId);
    this.assertCanComment(user, project);

    const comment = await this.comments.save(
      this.comments.create({
        projectId,
        stepId: dto.stepId,
        authorId: user.id,
        type: dto.type || 'comment',
        content: dto.content,
      }),
    );

    await this.projects.update(projectId, { latestUpdate: dto.content });
    await this.notifyProjectMembers(project, '项目有新批注', `项目「${project.name}」新增了一条${comment.type}。`, user.id);
    await this.communication.notifyMentions(dto.content, user, 'project', projectId);
    return comment;
  }

  async recalculateProjectProgress(projectId: string) {
    const tasks = await this.tasks.find({ where: { projectId } });
    const progress = tasks.length ? Math.round(tasks.reduce((sum, task) => sum + (task.progress || 0), 0) / tasks.length) : 0;
    await this.projects.update(projectId, { progress });
    return progress;
  }

  async syncFromTask(projectId: string, stepId: string | undefined, content: string, progress?: number) {
    if (stepId) {
      const step = await this.steps.findOne({ where: { id: stepId, projectId } });
      if (step) {
        step.note = content;
        if (progress !== undefined) {
          step.progress = progress;
        }
        if (progress === 100) {
          step.status = 'done';
        }
        await this.steps.save(step);
      }
    }
    await this.projects.update(projectId, { latestUpdate: content });
    return this.recalculateProjectProgress(projectId);
  }

  private async getProjectOrThrow(id: string) {
    const project = await this.projects.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  private canReadProject(user: User, project: Project) {
    return project.ownerId === user.id || project.participantIds.includes(user.id);
  }

  private canWriteProject(user: User, project: Project) {
    return hasPermission(user, 'admin:manage') || project.ownerId === user.id || hasPermission(user, 'project:write');
  }

  private assertCanRead(user: User, project: Project) {
    if (!hasPermission(user, 'project:read') || (!this.canReadProject(user, project) && !hasPermission(user, 'project:write'))) {
      throw new ForbiddenException('No project access');
    }
  }

  private assertCanWrite(user: User, project: Project) {
    if (!this.canWriteProject(user, project)) {
      throw new ForbiddenException('No project write access');
    }
  }

  private async assertCanWriteProjectOrAssignedStep(user: User, project: Project, stepId: string) {
    if (this.canWriteProject(user, project)) {
      return;
    }
    const step = await this.steps.findOne({ where: { id: stepId, projectId: project.id } });
    if (step?.assigneeId !== user.id) {
      throw new ForbiddenException('No project step write access');
    }
  }

  private assertCanComment(user: User, project: Project) {
    if (!hasPermission(user, 'project:comment') || (!this.canReadProject(user, project) && !hasPermission(user, 'project:write'))) {
      throw new ForbiddenException('No project comment access');
    }
  }

  private async notifyProjectMembers(project: Project, title: string, content: string, actorId?: string) {
    const userIds = Array.from(new Set([project.ownerId, ...(project.participantIds || [])].filter(Boolean))) as string[];
    await Promise.all(
      userIds
        .filter((userId) => userId !== actorId)
        .map((userId) =>
          this.notifications.create({
            userId,
            title,
            content,
            type: 'project',
            relatedType: 'project',
            relatedId: project.id,
          }),
        ),
    );
  }
}
