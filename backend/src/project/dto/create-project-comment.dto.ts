import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateProjectCommentDto {
  @IsOptional()
  @IsString()
  stepId?: string;

  @IsOptional()
  @IsIn(['comment', 'note', 'progress', 'result', 'report'])
  type?: 'comment' | 'note' | 'progress' | 'result' | 'report';

  @IsString()
  content: string;
}
