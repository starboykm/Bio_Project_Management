import { IsOptional, IsString } from 'class-validator';

export class CreateTranslationDto {
  @IsString()
  key: string;

  @IsString()
  zh: string;

  @IsString()
  en: string;

  @IsOptional()
  @IsString()
  module?: string;
}
