import { IsArray, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProjectStepDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;
}

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty({ message: '项目名称不能为空' })
  name: string;

  @IsOptional()
  @IsIn(['trial', 'customer', 'internal'])
  type?: 'trial' | 'customer' | 'internal';

  @IsOptional()
  @IsIn(['planning', 'active', 'paused', 'completed'])
  status?: 'planning' | 'active' | 'paused' | 'completed';

  @IsOptional()
  @IsString()
  cropType?: string;

  @IsOptional()
  @IsString()
  trialField?: string;

  @IsOptional()
  @IsString()
  microbialBatch?: string;

  @IsOptional()
  @IsString()
  fertilizationPlan?: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @ValidateIf((dto: CreateProjectDto) => dto.type === 'customer')
  @IsNotEmpty({ message: '客户合作项目必须选择关联客户' })
  customerId?: string;

  @IsOptional()
  @IsString()
  contractName?: string;

  @IsOptional()
  @IsString()
  contractPath?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsArray()
  participantIds?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @IsString()
  latestUpdate?: string;

  @IsOptional()
  @IsString()
  resultSummary?: string;

  @IsOptional()
  @IsString()
  reportContent?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateProjectStepDto)
  steps?: CreateProjectStepDto[];

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
