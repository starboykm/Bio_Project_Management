import { IsArray, IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import type { FormField } from '../form-definition.entity';

export class CreateFormDefinitionDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  fields?: FormField[];

  @IsOptional()
  @IsIn(['report', 'board', 'table'])
  viewMode?: 'report' | 'board' | 'table';

  @IsOptional()
  @IsBoolean()
  showInReport?: boolean;

  @IsOptional()
  @IsBoolean()
  showInDashboard?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
