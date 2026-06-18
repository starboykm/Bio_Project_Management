import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('knowledge_articles')
export class KnowledgeArticle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  subtitle?: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  richContent?: string;

  @Column({ type: 'text', nullable: true })
  markdownContent?: string;

  @Column({ default: 'rich' })
  editorMode: 'rich' | 'markdown';

  @Column({ type: 'simple-array', default: '' })
  tags: string[];

  @Column({ nullable: true })
  category?: string;

  @Column({ nullable: true })
  attachmentName?: string;

  @Column({ nullable: true })
  attachmentPath?: string;

  @Column({ nullable: true })
  authorId?: string;

  @Column({ type: 'simple-array', default: '' })
  collaboratorIds: string[];

  @Column({ default: 'readonly' })
  permissionMode: 'readonly' | 'editable' | 'collab' | 'share';

  @Column({ type: 'simple-json', nullable: true })
  attachments?: Array<{ name: string; url: string; type: string }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
