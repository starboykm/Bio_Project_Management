import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  userId: string;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsIn(['task', 'project', 'message', 'system'])
  type?: 'task' | 'project' | 'message' | 'system';

  @IsOptional()
  @IsString()
  relatedType?: string;

  @IsOptional()
  @IsString()
  relatedId?: string;
}
