import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, ValidateIf } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty({ message: '任务标题不能为空' })
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  stepId?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsString()
  reporterId?: string;

  @IsOptional()
  @IsString()
  progressNote?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @IsIn(['todo', 'doing', 'review', 'done'])
  status?: 'todo' | 'doing' | 'review' | 'done';

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: 'low' | 'medium' | 'high' | 'urgent';

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsIn(['none', 'daily', 'weekly', 'monthly', 'custom'])
  recurrenceType?: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';

  @ValidateIf((dto: CreateTaskDto) => Boolean(dto.recurrenceType && dto.recurrenceType !== 'none'))
  @IsNumber()
  @Min(1)
  recurrenceInterval?: number;

  @IsOptional()
  @IsString()
  recurrenceTime?: string;

  @ValidateIf((dto: CreateTaskDto) => dto.recurrenceType === 'weekly')
  @IsNumber()
  @Min(1)
  @Max(7)
  recurrenceDayOfWeek?: number;

  @ValidateIf((dto: CreateTaskDto) => dto.recurrenceType === 'monthly')
  @IsNumber()
  @Min(1)
  @Max(31)
  recurrenceDayOfMonth?: number;

  @ValidateIf((dto: CreateTaskDto) => dto.recurrenceType === 'custom')
  @IsString()
  @IsNotEmpty({ message: '自定义定时任务必须填写 Cron 表达式' })
  recurrenceCron?: string;
}
