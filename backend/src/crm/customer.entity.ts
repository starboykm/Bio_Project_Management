import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  region?: string;

  @Column({ nullable: true })
  industry?: string;

  @Column({ nullable: true })
  contactName?: string;

  @Column({ nullable: true })
  contactPhone?: string;

  @Column({ nullable: true })
  contactEmail?: string;

  @Column({ default: 'lead' })
  stage: 'lead' | 'qualified' | 'trial' | 'proposal' | 'won' | 'lost';

  @Column({ nullable: true })
  ownerId?: string;

  @Column({ nullable: true })
  trackingUserId?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  source?: string;

  @Column({ type: 'text', nullable: true })
  requirement?: string;

  @Column({ nullable: true })
  nextFollowUpDate?: string;

  @Column({ type: 'text', nullable: true })
  followUpNote?: string;

  @Column({ type: 'simple-json', nullable: true })
  customData?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
