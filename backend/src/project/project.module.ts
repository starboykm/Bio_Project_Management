import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunicationModule } from '../communication/communication.module';
import { SecurityModule } from '../common/security.module';
import { NotificationModule } from '../notification/notification.module';
import { Project } from './project.entity';
import { ProjectComment } from './project-comment.entity';
import { ProjectStep } from './project-step.entity';
import { Task } from '../task/task.entity';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectStep, ProjectComment, Task]), SecurityModule, NotificationModule, CommunicationModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectModule {}
