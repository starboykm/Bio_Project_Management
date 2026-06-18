import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('communication_messages')
export class CommunicationMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  senderId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'simple-array', default: '' })
  recipientIds: string[];

  @Column({ type: 'simple-array', default: '' })
  deletedForIds: string[];

  @Column({ default: '' })
  conversationKey: string;

  @Column({ type: 'simple-array', default: '' })
  readByIds: string[];

  @Column({ nullable: true })
  relatedType?: string;

  @Column({ nullable: true })
  relatedId?: string;

  @CreateDateColumn()
  createdAt: Date;
}
