import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationsService } from '../notification/notifications.service';
import { User } from '../user/user.entity';
import { CommunicationMessage } from './communication-message.entity';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class CommunicationService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(CommunicationMessage) private readonly messages: Repository<CommunicationMessage>,
    private readonly notifications: NotificationsService,
  ) {}

  async mentionOptions() {
    const users = await this.users.find({ where: { isActive: true }, order: { name: 'ASC' } });
    return [{ id: 'all', name: 'all', label: '@all' }, ...users.map((user) => ({ id: user.id, name: user.name, label: `@[${user.name}]`, email: user.email }))];
  }

  async findThreads(user: User) {
    const messages = await this.findVisibleMessages(user);
    const users = await this.users.find({ where: { isActive: true } });
    const userMap = new Map(users.map((item) => [item.id, item]));
    const groups = new Map<string, CommunicationMessage[]>();

    for (const message of messages) {
      const key = message.conversationKey || this.createConversationKey([message.senderId, ...(message.recipientIds || [])]);
      groups.set(key, [...(groups.get(key) || []), message]);
    }

    return Array.from(groups.entries())
      .map(([conversationKey, items]) => {
        const sorted = [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const latest = sorted[sorted.length - 1];
        const participantIds = this.participantIds(sorted);
        return {
          conversationKey,
          participantIds,
          participantNames: participantIds.map((id) => userMap.get(id)?.name || id),
          latestContent: latest.content,
          latestAt: latest.createdAt,
          unreadCount: sorted.filter((item) => item.senderId !== user.id && !(item.readByIds || []).includes(user.id)).length,
        };
      })
      .sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
  }

  async findForUser(user: User, conversationKey?: string) {
    const [messages, users] = await Promise.all([this.findVisibleMessages(user), this.users.find({ where: { isActive: true } })]);
    const userMap = new Map(users.map((item) => [item.id, item]));

    return messages
      .filter((message) => !conversationKey || (message.conversationKey || this.createConversationKey([message.senderId, ...(message.recipientIds || [])])) === conversationKey)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((message) => ({
        ...message,
        senderName: userMap.get(message.senderId)?.name || '-',
        recipientNames: (message.recipientIds || []).map((id) => userMap.get(id)?.name || id),
        isUnread: message.senderId !== user.id && !(message.readByIds || []).includes(user.id),
      }));
  }

  async sendMessage(dto: SendMessageDto, sender: User) {
    const recipients = await this.resolveRecipients(dto, sender.id);
    const participantIds = Array.from(new Set([sender.id, ...recipients.map((recipient) => recipient.id)]));
    const conversationKey = dto.conversationKey || this.createConversationKey(participantIds);
    const message = await this.messages.save(
      this.messages.create({
        senderId: sender.id,
        content: dto.content,
        recipientIds: recipients.map((recipient) => recipient.id),
        conversationKey,
        readByIds: [sender.id],
        relatedType: dto.relatedType || 'message',
        relatedId: dto.relatedId,
      }),
    );

    await this.createMentionNotifications(recipients, sender, dto.content, dto.relatedType || 'message', conversationKey);
    return { delivered: recipients.length, messageId: message.id, conversationKey };
  }

  async markThreadRead(conversationKey: string, user: User) {
    const messages = await this.findVisibleMessages(user);
    await Promise.all(
      messages
        .filter((message) => (message.conversationKey || this.createConversationKey([message.senderId, ...(message.recipientIds || [])])) === conversationKey)
        .map((message) => {
          message.readByIds = Array.from(new Set([...(message.readByIds || []), user.id]));
          return this.messages.save(message);
        }),
    );
    return { read: true };
  }

  async remove(id: string, user: User) {
    const message = await this.messages.findOne({ where: { id } });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    if (!this.canSeeMessage(message, user.id)) {
      throw new ForbiddenException('No permission to delete this message');
    }

    message.deletedForIds = Array.from(new Set([...(message.deletedForIds || []), user.id]));
    await this.messages.save(message);
    return { deleted: true };
  }

  async notifyMentions(content: string, sender: User, relatedType: string, relatedId?: string) {
    const recipients = await this.resolveRecipients({ content }, sender.id);
    await this.createMentionNotifications(recipients, sender, content, relatedType, relatedId);
    return recipients.length;
  }

  private async findVisibleMessages(user: User) {
    const messages = await this.messages.find({ order: { createdAt: 'DESC' } });
    return messages.filter((message) => this.canSeeMessage(message, user.id) && !(message.deletedForIds || []).includes(user.id));
  }

  private async resolveRecipients(dto: Pick<SendMessageDto, 'content' | 'recipientIds' | 'conversationKey'>, senderId: string) {
    const users = await this.users.find({ where: { isActive: true } });
    const tokens = this.extractMentions(dto.content);
    if (tokens.has('all')) {
      return users.filter((user) => user.id !== senderId);
    }

    const explicitIds = new Set(dto.recipientIds || []);
    if (dto.conversationKey) {
      this.parseConversationKey(dto.conversationKey).filter((id) => id !== senderId).forEach((id) => explicitIds.add(id));
    }

    return users.filter(
      (user) =>
        user.id !== senderId &&
        (explicitIds.has(user.id) || tokens.has(user.name.toLowerCase()) || tokens.has(user.email.toLowerCase())),
    );
  }

  private extractMentions(content: string) {
    const tokens = new Set<string>();
    const pattern = /@\[(.+?)\]|@all|@([^\s,，。；;]+)/gi;
    for (const match of content.matchAll(pattern)) {
      const value = match[0].toLowerCase() === '@all' ? 'all' : (match[1] || match[2] || '').trim().toLowerCase();
      if (value) {
        tokens.add(value);
      }
    }
    return tokens;
  }

  private createConversationKey(userIds: string[]) {
    return Array.from(new Set(userIds)).sort().join('__');
  }

  private parseConversationKey(conversationKey: string) {
    return conversationKey.split('__').filter(Boolean);
  }

  private participantIds(messages: CommunicationMessage[]) {
    return Array.from(new Set(messages.flatMap((message) => [message.senderId, ...(message.recipientIds || [])]))).sort();
  }

  private canSeeMessage(message: CommunicationMessage, userId: string) {
    return message.senderId === userId || (message.recipientIds || []).includes(userId);
  }

  private async createMentionNotifications(recipients: User[], sender: User, content: string, relatedType: string, relatedId?: string) {
    await Promise.all(
      recipients.map((recipient) =>
        this.notifications.create({
          userId: recipient.id,
          title: `${sender.name} @了你`,
          content,
          type: 'message',
          relatedType,
          relatedId,
        }),
      ),
    );
  }
}
