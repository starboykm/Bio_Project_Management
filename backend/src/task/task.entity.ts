import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  projectId?: string;

  @Column({ nullable: true })
  stepId?: string;

  @Column({ nullable: true })
  assigneeId?: string;

  @Column({ nullable: true })
  reporterId?: string;

  @Column({ type: 'text', nullable: true })
  progressNote?: string;

  @Column({ default: 0 })
  progress: number;

  @Column({ default: 'todo' })
  status: 'todo' | 'doing' | 'review' | 'done';

  @Column({ default: 'medium' })
  priority: 'low' | 'medium' | 'high' | 'urgent';

  @Column({ type: 'date', nullable: true })
  dueDate?: string;

  @Column({ default: 'none' })
  recurrenceType: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';

  @Column({ default: 1 })
  recurrenceInterval: number;

  @Column({ nullable: true })
  recurrenceTime?: string;

  @Column({ nullable: true })
  recurrenceDayOfWeek?: number;

  @Column({ nullable: true })
  recurrenceDayOfMonth?: number;

  @Column({ nullable: true })
  recurrenceCron?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
