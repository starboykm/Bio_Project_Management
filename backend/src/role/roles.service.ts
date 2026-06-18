import { ConflictException, Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PERMISSIONS, ROLE_PERMISSIONS } from '../common/permissions';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './role.entity';

const DEFAULT_ROLES: CreateRoleDto[] = [
  { code: 'admin', name: '管理员', description: '拥有系统全部权限', permissions: [...PERMISSIONS], isSystem: true },
  { code: 'manager', name: '项目经理', description: '管理项目、任务、客户和知识库', permissions: ROLE_PERMISSIONS.manager, isSystem: true },
  { code: 'member', name: '成员', description: '参与项目、更新任务和查看知识库', permissions: ROLE_PERMISSIONS.member, isSystem: true },
  { code: 'viewer', name: '只读', description: '只读访问项目、任务、知识库和报表', permissions: ROLE_PERMISSIONS.viewer, isSystem: true },
];

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(@InjectRepository(Role) private readonly roles: Repository<Role>) {}

  async onModuleInit() {
    for (const role of DEFAULT_ROLES) {
      const exists = await this.roles.findOne({ where: { code: role.code } });
      if (!exists) {
        await this.roles.save(this.roles.create(role));
      }
    }
  }

  findAll() {
    return this.roles.find({ order: { isSystem: 'DESC', code: 'ASC' } });
  }

  async findByCodes(codes: string[] = []) {
    if (!codes.length) {
      return [];
    }
    return this.roles.find({ where: { code: In(codes) } });
  }

  async create(dto: CreateRoleDto) {
    const exists = await this.roles.findOne({ where: { code: dto.code } });
    if (exists) {
      throw new ConflictException('Role code already exists');
    }
    return this.roles.save(this.roles.create({ ...dto, permissions: dto.permissions || [], isSystem: dto.isSystem ?? false }));
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.roles.preload({ id, ...dto });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return this.roles.save(role);
  }
}
