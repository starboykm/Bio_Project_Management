import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ default: 'operations' })
  type: 'operations' | 'project' | 'crm';

  @Column({ type: 'simple-json', default: '{}' })
  payload: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
