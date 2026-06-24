import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityModule } from '../common/security.module';
import { Task } from '../task/task.entity';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { Customer } from './customer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, Task]), SecurityModule],
  controllers: [CrmController],
  providers: [CrmService],
  exports: [CrmService],
})
export class CrmModule {}
