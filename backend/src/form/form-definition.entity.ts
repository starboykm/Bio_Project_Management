import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type FormField = {
  id: string;
  label: string;
  key: string;
  type: 'text' | 'textarea' | 'select' | 'date' | 'number' | 'user';
  required?: boolean;
  defaultValue?: string;
  options?: string[];
  showInReport?: boolean;
  showInDashboard?: boolean;
};

@Entity('form_definitions')
export class FormDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'simple-json', default: '[]' })
  fields: FormField[];

  @Column({ default: 'table' })
  viewMode: 'report' | 'board' | 'table';

  @Column({ default: true })
  showInReport: boolean;

  @Column({ default: true })
  showInDashboard: boolean;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
