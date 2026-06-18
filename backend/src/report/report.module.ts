import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityModule } from '../common/security.module';
import { Customer } from '../crm/customer.entity';
import { KnowledgeArticle } from '../knowledge/knowledge-article.entity';
import { Project } from '../project/project.entity';
import { ProjectStep } from '../project/project-step.entity';
import { Task } from '../task/task.entity';
import { ReportController } from './report.controller';
import { Report } from './report.entity';
import { ReportService } from './report.service';

@Module({
  imports: [TypeOrmModule.forFeature([Report, Project, ProjectStep, Task, Customer, KnowledgeArticle]), SecurityModule],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
