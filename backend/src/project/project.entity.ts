import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ default: 'trial' })
  type: 'trial' | 'customer' | 'internal';

  @Column({ default: 'planning' })
  status: 'planning' | 'active' | 'paused' | 'completed';

  @Column({ nullable: true })
  cropType?: string;

  @Column({ nullable: true })
  trialField?: string;

  @Column({ nullable: true })
  microbialBatch?: string;

  @Column({ type: 'text', nullable: true })
  fertilizationPlan?: string;

  @Column({ nullable: true })
  ownerId?: string;

  @Column({ type: 'simple-array', default: '' })
  participantIds: string[];

  @Column({ default: 0 })
  progress: number;

  @Column({ type: 'text', nullable: true })
  latestUpdate?: string;

  @Column({ type: 'text', nullable: true })
  resultSummary?: string;

  @Column({ type: 'text', nullable: true })
  reportContent?: string;

  @Column({ type: 'date', nullable: true })
  startDate?: string;

  @Column({ type: 'date', nullable: true })
  endDate?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
