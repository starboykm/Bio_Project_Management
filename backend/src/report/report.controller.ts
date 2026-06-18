import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Permissions } from '../common/permissions.decorator';
import { PermissionsGuard } from '../common/permissions.guard';
import { ReportService } from './report.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('dashboard')
  @Permissions('report:read')
  dashboard() {
    return this.reportService.dashboard();
  }

  @Get()
  @Permissions('report:read')
  findAll() {
    return this.reportService.findAll();
  }
}
