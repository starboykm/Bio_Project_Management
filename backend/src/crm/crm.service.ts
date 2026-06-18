import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CrmService {
  constructor(@InjectRepository(Customer) private readonly customers: Repository<Customer>) {}

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

  create(dto: CreateCustomerDto) {
    return this.customers.save(this.customers.create({ ...dto, trackingUserId: dto.trackingUserId || dto.ownerId }));
  }

  async update(id: string, dto: UpdateCustomerDto) {
    const customer = await this.customers.preload({ id, ...dto });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return this.customers.save(customer);
  }
}
