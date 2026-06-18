import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityModule } from '../common/security.module';
import { FormController } from './form.controller';
import { FormDefinition } from './form-definition.entity';
import { FormService } from './form.service';

@Module({
  imports: [TypeOrmModule.forFeature([FormDefinition]), SecurityModule],
  controllers: [FormController],
  providers: [FormService],
  exports: [FormService],
})
export class FormModule {}
