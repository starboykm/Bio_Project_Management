import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFormDefinitionDto } from './dto/create-form-definition.dto';
import { UpdateFormDefinitionDto } from './dto/update-form-definition.dto';
import { FormDefinition, FormField } from './form-definition.entity';

const CRM_FIELDS: FormField[] = [
  { id: 'name', key: 'name', label: '客户名称', type: 'text', required: true, showInReport: true, showInDashboard: true },
  { id: 'trackingUserId', key: 'trackingUserId', label: '跟踪人员', type: 'user', required: true, showInReport: true, showInDashboard: true },
  { id: 'stage', key: 'stage', label: '阶段', type: 'select', required: true, defaultValue: 'lead', options: ['lead', 'qualified', 'trial', 'proposal', 'won', 'lost'], showInReport: true, showInDashboard: true },
  { id: 'region', key: 'region', label: '区域', type: 'text', showInReport: true },
  { id: 'industry', key: 'industry', label: '行业', type: 'text', showInReport: true },
  { id: 'contactName', key: 'contactName', label: '联系人', type: 'text', showInReport: true },
  { id: 'contactPhone', key: 'contactPhone', label: '联系电话', type: 'text' },
  { id: 'contactEmail', key: 'contactEmail', label: '邮箱', type: 'text' },
  { id: 'nextFollowUpDate', key: 'nextFollowUpDate', label: '下次跟进日期', type: 'date', showInReport: true, showInDashboard: true },
  { id: 'requirement', key: 'requirement', label: '需求', type: 'textarea' },
  { id: 'followUpNote', key: 'followUpNote', label: '跟进记录', type: 'textarea' },
];

@Injectable()
export class FormService implements OnModuleInit {
  constructor(@InjectRepository(FormDefinition) private readonly forms: Repository<FormDefinition>) {}

  async onModuleInit() {
    const existing = await this.forms.findOne({ where: { code: 'crm' } });
    if (!existing) {
      await this.forms.save(
        this.forms.create({
          code: 'crm',
          name: 'CRM 客户表单',
          description: 'CRM 模块默认客户信息表单',
          fields: CRM_FIELDS,
          viewMode: 'table',
          showInReport: true,
          showInDashboard: true,
          isActive: true,
        }),
      );
    }
  }

  findAll() {
    return this.forms.find({ order: { updatedAt: 'DESC' } });
  }

  async findByCode(code: string) {
    const form = await this.forms.findOne({ where: { code } });
    if (!form) {
      throw new NotFoundException('Form definition not found');
    }
    return form;
  }

  create(dto: CreateFormDefinitionDto) {
    return this.forms.save(this.forms.create({ ...dto, fields: dto.fields || [] }));
  }

  async update(id: string, dto: UpdateFormDefinitionDto) {
    const form = await this.forms.preload({ id, ...dto });
    if (!form) {
      throw new NotFoundException('Form definition not found');
    }
    return this.forms.save(form);
  }
}
