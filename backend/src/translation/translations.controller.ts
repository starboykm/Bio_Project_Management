import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Permissions } from '../common/permissions.decorator';
import { PermissionsGuard } from '../common/permissions.guard';
import { CreateTranslationDto } from './dto/create-translation.dto';
import { UpdateTranslationDto } from './dto/update-translation.dto';
import { TranslationsService } from './translations.service';

@Controller('translations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TranslationsController {
  constructor(private readonly translationsService: TranslationsService) {}

  @Get()
  findAll() {
    return this.translationsService.findAll();
  }

  @Post()
  @Permissions('admin:manage')
  create(@Body() dto: CreateTranslationDto) {
    return this.translationsService.create(dto);
  }

  @Patch(':id')
  @Permissions('admin:manage')
  update(@Param('id') id: string, @Body() dto: UpdateTranslationDto) {
    return this.translationsService.update(id, dto);
  }
}
