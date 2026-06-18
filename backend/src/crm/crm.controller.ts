import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Permissions } from '../common/permissions.decorator';
import { PermissionsGuard } from '../common/permissions.guard';
import { CrmService } from './crm.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('crm/customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get()
  @Permissions('crm:read')
  findAll() {
    return this.crmService.findAll();
  }

  @Get(':id')
  @Permissions('crm:read')
  findOne(@Param('id') id: string) {
    return this.crmService.findOne(id);
  }

  @Post()
  @Permissions('crm:write')
  create(@Body() dto: CreateCustomerDto) {
    return this.crmService.create(dto);
  }

  @Patch(':id')
  @Permissions('crm:write')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.crmService.update(id, dto);
  }
}
