import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { CrmModule } from './crm/crm.module';
import { CommunicationMessage } from './communication/communication-message.entity';
import { CommunicationModule } from './communication/communication.module';
import { FormDefinition } from './form/form-definition.entity';
import { FormModule } from './form/form.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { NotificationModule } from './notification/notification.module';
import { ProjectModule } from './project/project.module';
import { RedisModule } from './redis/redis.module';
import { ReportModule } from './report/report.module';
import { RoleModule } from './role/role.module';
import { SearchModule } from './search/search.module';
import { TaskModule } from './task/task.module';
import { TranslationModule } from './translation/translation.module';
import { UserModule } from './user/user.module';
import { User } from './user/user.entity';
import { Project } from './project/project.entity';
import { ProjectComment } from './project/project-comment.entity';
import { ProjectStep } from './project/project-step.entity';
import { Task } from './task/task.entity';
import { KnowledgeArticle } from './knowledge/knowledge-article.entity';
import { KnowledgeCategory } from './knowledge/knowledge-category.entity';
import { KnowledgeTag } from './knowledge/knowledge-tag.entity';
import { Customer } from './crm/customer.entity';
import { Report } from './report/report.entity';
import { Notification } from './notification/notification.entity';
import { Role } from './role/role.entity';
import { Translation } from './translation/translation.entity';

const entities = [
  User,
  Role,
  Translation,
  Project,
  ProjectStep,
  ProjectComment,
  Task,
  KnowledgeArticle,
  KnowledgeCategory,
  KnowledgeTag,
  FormDefinition,
  Customer,
  Report,
  Notification,
  CommunicationMessage,
];

function createDatabaseOptions(config: ConfigService): TypeOrmModuleOptions {
  const databaseType = config.get<string>('DATABASE_TYPE', 'postgres');
  const synchronize = config.get<string>('DATABASE_SYNCHRONIZE', 'true') === 'true';

  if (databaseType === 'sqljs') {
    return {
      type: 'sqljs',
      location: config.get<string>('DATABASE_FILE', './data/standalone.sqlite'),
      autoSave: true,
      entities,
      synchronize,
    };
  }

  return {
    type: 'postgres',
    host: config.get<string>('DATABASE_HOST', 'localhost'),
    port: config.get<number>('DATABASE_PORT', 5432),
    username: config.get<string>('DATABASE_USER', 'bio_pm'),
    password: config.get<string>('DATABASE_PASSWORD', 'bio_pm_password'),
    database: config.get<string>('DATABASE_NAME', 'bio_pm'),
    entities,
    synchronize,
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: createDatabaseOptions,
    }),
    RedisModule,
    NotificationModule,
    CommunicationModule,
    RoleModule,
    TranslationModule,
    UserModule,
    AuthModule,
    ProjectModule,
    TaskModule,
    FormModule,
    KnowledgeModule,
    CrmModule,
    ReportModule,
    SearchModule,
  ],
})
export class AppModule {}
