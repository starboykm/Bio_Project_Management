import { IsEmail, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsIn(['lead', 'qualified', 'trial', 'proposal', 'won', 'lost'])
  stage?: 'lead' | 'qualified' | 'trial' | 'proposal' | 'won' | 'lost';

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  trackingUserId?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  requirement?: string;

  @IsOptional()
  @IsString()
  nextFollowUpDate?: string;

  @IsOptional()
  @IsString()
  followUpNote?: string;

  @IsOptional()
  @IsObject()
  customData?: Record<string, unknown>;
}
