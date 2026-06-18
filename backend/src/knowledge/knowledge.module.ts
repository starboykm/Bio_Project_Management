import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityModule } from '../common/security.module';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeArticle } from './knowledge-article.entity';
import { KnowledgeCategory } from './knowledge-category.entity';
import { KnowledgeTag } from './knowledge-tag.entity';
import { KnowledgeService } from './knowledge.service';

@Module({
  imports: [TypeOrmModule.forFeature([KnowledgeArticle, KnowledgeCategory, KnowledgeTag]), SecurityModule],
  controllers: [KnowledgeController],
  providers: [KnowledgeService],
})
export class KnowledgeModule {}
