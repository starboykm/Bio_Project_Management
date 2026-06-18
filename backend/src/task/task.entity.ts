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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
