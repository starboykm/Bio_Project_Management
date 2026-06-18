import { Transform } from 'class-transformer';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  conversationKey?: string;

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : String(value || '').split(',').filter(Boolean)))
  @IsArray()
  recipientIds?: string[];

  @IsOptional()
  @IsString()
  relatedType?: string;

  @IsOptional()
  @IsString()
  relatedId?: string;
}
