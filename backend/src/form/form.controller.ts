import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Permissions } from '../common/permissions.decorator';
import { PermissionsGuard } from '../common/permissions.guard';
import { CreateFormDefinitionDto } from './dto/create-form-definition.dto';
import { UpdateFormDefinitionDto } from './dto/update-form-definition.dto';
import { FormService } from './form.service';

@Controller('forms')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FormController {
  constructor(private readonly formService: FormService) {}

  @Get()
  @Permissions('form:read')
  findAll() {
    return this.formService.findAll();
  }

  @Get('code/:code')
  @Permissions('form:read')
  findByCode(@Param('code') code: string) {
    return this.formService.findByCode(code);
  }

  @Post()
  @Permissions('form:manage')
  create(@Body() dto: CreateFormDefinitionDto) {
    return this.formService.create(dto);
  }

  @Patch(':id')
  @Permissions('form:manage')
  update(@Param('id') id: string, @Body() dto: UpdateFormDefinitionDto) {
    return this.formService.update(id, dto);
  }
}
