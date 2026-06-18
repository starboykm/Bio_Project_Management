import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column()
  passwordHash: string;

  @Column({ type: 'simple-array', default: 'member' })
  roles: string[];

  @Column({ type: 'simple-array', default: '' })
  permissions: string[];

  @Column({ nullable: true })
  title?: string;

  @Column({ nullable: true })
  department?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  wechat?: string;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ default: 'zh' })
  language: 'zh' | 'en';

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
