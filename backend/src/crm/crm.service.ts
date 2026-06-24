import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../task/task.entity';
import { User } from '../user/user.entity';
import { Customer, CustomerFollowUpRecord } from './customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CrmService {
  constructor(
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
  ) {}

  findAll() {
    return this.customers.find({ order: { updatedAt: 'DESC' } });
  }

  async findOne(id: string) {
    const customer = await this.customers.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }

  async create(dto: CreateCustomerDto, user: User) {
    const customer = this.customers.create({
      ...this.cleanDto(dto),
      trackingUserId: dto.trackingUserId || dto.ownerId || user.id,
      ownerId: dto.ownerId || dto.trackingUserId || user.id,
      followUpStatus: dto.followUpStatus || 'pending',
      followUpRecords: [],
    });
    this.appendFollowUpRecord(customer, dto, user);
    const saved = await this.customers.save(customer);
    return this.syncNextFollowUpTask(saved, user);
  }

  async update(id: string, dto: UpdateCustomerDto, user: User) {
    const current = await this.findOne(id);
    const customer = await this.customers.preload({
      id,
      ...this.cleanDto(dto),
      followUpStatus: dto.followUpStatus || current.followUpStatus || 'pending',
      trackingUserId: dto.trackingUserId || dto.ownerId || current.trackingUserId,
      ownerId: dto.ownerId || dto.trackingUserId || current.ownerId,
      followUpRecords: current.followUpRecords || [],
      nextFollowUpTaskId: current.nextFollowUpTaskId,
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    this.appendFollowUpRecord(customer, dto, user);
    const saved = await this.customers.save(customer);
    return this.syncNextFollowUpTask(saved, user);
  }

  private cleanDto<T extends CreateCustomerDto | UpdateCustomerDto>(dto: T) {
    return Object.fromEntries(Object.entries(dto).filter(([, value]) => value !== '' && value !== undefined && value !== null)) as T;
  }

  private appendFollowUpRecord(customer: Customer, dto: CreateCustomerDto | UpdateCustomerDto, user: User) {
    const status = dto.followUpStatus || customer.followUpStatus || 'pending';
    const note = dto.followUpNote?.trim();
    const date = dto.followUpDate || (status !== 'pending' || note ? new Date().toISOString().slice(0, 10) : undefined);
    if (!date && !note && status === 'pending') {
      return;
    }

    const records = customer.followUpRecords || [];
    const latest = records[records.length - 1];
    if (
      latest &&
      latest.date === date &&
      latest.status === status &&
      (latest.note || '') === (note || '') &&
      latest.nextFollowUpDate === customer.nextFollowUpDate
    ) {
      return;
    }

    const record: CustomerFollowUpRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: date || new Date().toISOString().slice(0, 10),
      status,
      note,
      userId: user.id,
      nextFollowUpDate: customer.nextFollowUpDate,
      createdAt: new Date().toISOString(),
    };
    customer.followUpRecords = [...records, record];
    customer.followUpDate = record.date;
    customer.followUpStatus = status;
  }

  private async syncNextFollowUpTask(customer: Customer, user: User) {
    if (!customer.nextFollowUpDate || !customer.trackingUserId) {
      return customer;
    }

    const taskPayload = {
      title: `跟进客户：${customer.name}`,
      description: `CRM客户下一次跟进：${customer.name}`,
      assigneeId: customer.trackingUserId,
      reporterId: user.id,
      status: 'todo' as const,
      priority: 'medium' as const,
      dueDate: customer.nextFollowUpDate,
      progress: 0,
      progressNote: customer.followUpNote || 'CRM自动生成的客户跟进任务',
    };

    let task: Task | null = null;
    if (customer.nextFollowUpTaskId) {
      task = await this.tasks.findOne({ where: { id: customer.nextFollowUpTaskId } });
    }

    if (task) {
      await this.tasks.save(this.tasks.merge(task, taskPayload));
      return customer;
    }

    const created = await this.tasks.save(this.tasks.create(taskPayload));
    customer.nextFollowUpTaskId = created.id;
    return this.customers.save(customer);
  }
}
