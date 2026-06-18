import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hasPermission } from '../common/permissions';
import { NotificationsService } from '../notification/notifications.service';
import { Project } from '../project/project.entity';
import { User } from '../user/user.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './task.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    private readonly notifications: NotificationsService,
  ) {}

  async findAll(user: User, projectId?: string, scope: 'mine' | 'all' = 'mine') {
    const tasks = await this.tasks.find({
      where: projectId ? { projectId } : {},
      order: { updatedAt: 'DESC' },
    });

    if (scope === 'all' && hasPermission(user, 'task:read')) {
      return tasks;
    }

    return tasks.filter((task) => task.assigneeId === user.id);
  }

  async create(dto: CreateTaskDto, user: User) {
    if (!hasPermission(user, 'task:write')) {
      throw new ForbiddenException('No task write access');
    }

    const task = await this.tasks.save(
      this.tasks.create({
        ...dto,
        reporterId: dto.reporterId || user.id,
      }),
    );

    if (task.assigneeId && task.assigneeId !== user.id) {
      await this.notifications.create({
        userId: task.assigneeId,
        title: '你有新的任务',
        content: `任务「${task.title}」已分配给你。`,
        type: 'task',
        relatedType: 'task',
        relatedId: task.id,
      });
    }

    if (task.projectId) {
      await this.refreshProjectAfterTaskChange(task.projectId, task.progressNote || `任务「${task.title}」已创建`);
    }

    return task;
  }

  async update(id: string, dto: UpdateTaskDto, user: User) {
    const current = await this.tasks.findOne({ where: { id } });
    if (!current) {
      throw new NotFoundException('Task not found');
    }

    if (!this.canUpdateTask(user, current)) {
      throw new ForbiddenException('No task update access');
    }

    const previousProjectId = current.projectId;
    const task = await this.tasks.preload({ id, ...dto });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    if (dto.status === 'done' && dto.progress === undefined) {
      task.progress = 100;
    }

    const saved = await this.tasks.save(task);
    const latestUpdate = saved.progressNote || `任务「${saved.title}」状态更新为 ${saved.status}`;
    if (saved.projectId) {
      await this.refreshProjectAfterTaskChange(saved.projectId, latestUpdate);
    }
    if (previousProjectId && previousProjectId !== saved.projectId) {
      await this.refreshProjectAfterTaskChange(previousProjectId, `任务「${saved.title}」已移出项目。`);
    }

    if (saved.assigneeId && saved.assigneeId !== user.id) {
      await this.notifications.create({
        userId: saved.assigneeId,
        title: '任务已更新',
        content: `任务「${saved.title}」进度更新为 ${saved.progress}%。`,
        type: 'task',
        relatedType: 'task',
        relatedId: saved.id,
      });
    }

    return saved;
  }

  async remove(id: string, user: User) {
    const task = await this.tasks.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    if (!this.canUpdateTask(user, task)) {
      throw new ForbiddenException('No task delete access');
    }
    await this.tasks.delete(id);
    if (task.projectId) {
      await this.refreshProjectAfterTaskChange(task.projectId, `任务「${task.title}」已删除。`);
    }
    return { deleted: true, id };
  }

  private canUpdateTask(user: User, task: Task) {
    return hasPermission(user, 'admin:manage') || hasPermission(user, 'task:write') || task.assigneeId === user.id;
  }

  private async refreshProjectAfterTaskChange(projectId: string, latestUpdate: string) {
    const projectTasks = await this.tasks.find({ where: { projectId } });
    const progress = projectTasks.length ? Math.round(projectTasks.reduce((sum, task) => sum + (task.progress || 0), 0) / projectTasks.length) : 0;
    await this.projects.update(projectId, { latestUpdate, progress });
  }
}
