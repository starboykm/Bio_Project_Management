import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityModule } from '../common/security.module';
import { Customer } from '../crm/customer.entity';
import { KnowledgeArticle } from '../knowledge/knowledge-article.entity';
import { Project } from '../project/project.entity';
import { Task } from '../task/task.entity';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [TypeOrmModule.forFeature([Project, Task, KnowledgeArticle, Customer]), SecurityModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
