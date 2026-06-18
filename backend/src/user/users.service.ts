import { ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { resolvePermissions } from '../common/permissions';
import { RolesService } from '../role/roles.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './user.entity';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly config: ConfigService,
    private readonly rolesService: RolesService,
  ) {}

  async onModuleInit() {
    const email = this.config.get<string>('ADMIN_EMAIL', 'admin@bio.local');
    const exists = await this.findByEmail(email);
    if (!exists) {
      await this.create({
        email,
        name: 'System Admin',
        password: this.config.get<string>('ADMIN_PASSWORD', 'Admin123456'),
        roles: ['admin'],
        permissions: [],
      });
    }
  }

  async findAll() {
    const users = await this.users.find({ order: { createdAt: 'DESC' } });
    return Promise.all(users.map((user) => this.toPublicUser(user)));
  }

  findById(id: string) {
    return this.users.findOne({ where: { id } });
  }

  findByEmail(email: string) {
    return this.users.findOne({ where: { email } });
  }

  async create(dto: CreateUserDto) {
    const exists = await this.findByEmail(dto.email);
    if (exists) {
      throw new ConflictException('Email already exists');
    }

    const user = this.users.create({
      email: dto.email,
      name: dto.name,
      passwordHash: await bcrypt.hash(dto.password, 10),
      roles: dto.roles?.length ? dto.roles : ['member'],
      permissions: dto.permissions || [],
      title: dto.title,
      department: dto.department,
      phone: dto.phone,
      wechat: dto.wechat,
      avatarUrl: dto.avatarUrl,
      language: dto.language || 'zh',
      isActive: dto.isActive ?? true,
    });

    return this.toPublicUser(await this.users.save(user));
  }

  async update(id: string, dto: UpdateUserDto) {
    const { password, ...userDto } = dto;
    const user = await this.users.preload({
      id,
      ...userDto,
      passwordHash: password ? await bcrypt.hash(password, 10) : undefined,
    });
    return user ? this.toPublicUser(await this.users.save(user)) : null;
  }

  async updateProfile(id: string, dto: UpdateUserDto) {
    const allowed: UpdateUserDto = {
      name: dto.name,
      phone: dto.phone,
      wechat: dto.wechat,
      avatarUrl: dto.avatarUrl,
      language: dto.language,
    };
    return this.update(id, allowed);
  }

  async updateAvatar(id: string, avatarUrl: string) {
    return this.update(id, { avatarUrl });
  }

  async toPublicUser(user: User) {
    const { passwordHash, ...safeUser } = user;
    const roles = await this.rolesService.findByCodes(user.roles);
    return {
      ...safeUser,
      effectivePermissions: Array.from(new Set([...roles.flatMap((role) => role.permissions), ...resolvePermissions(user.roles, user.permissions)])),
    };
  }
}
