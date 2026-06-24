import { Transform } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateKnowledgeDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  richContent?: string;

  @IsOptional()
  @IsString()
  markdownContent?: string;

  @IsOptional()
  @IsIn(['rich', 'markdown'])
  editorMode?: 'rich' | 'markdown';

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : String(value || '').split(',').filter(Boolean)))
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : String(value || '').split(',').filter(Boolean)))
  @IsArray()
  collaboratorIds?: string[];

  @IsOptional()
  @IsArray()
  collaboratorPermissions?: Array<{ userId: string; permission: 'readonly' | 'editable' | 'collab' }>;

  @IsOptional()
  @IsIn(['all', 'private', 'selected'])
  visibilityMode?: 'all' | 'private' | 'selected';

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : String(value || '').split(',').filter(Boolean)))
  @IsArray()
  visibleUserIds?: string[];

  @IsOptional()
  @IsIn(['readonly', 'editable', 'collab', 'share'])
  permissionMode?: 'readonly' | 'editable' | 'collab' | 'share';

  @IsOptional()
  attachments?: Array<{ name: string; url: string; type: string }>;
}
