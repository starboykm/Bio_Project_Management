import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityModule } from '../common/security.module';
import { NotificationModule } from '../notification/notification.module';
import { User } from '../user/user.entity';
import { CommunicationMessage } from './communication-message.entity';
import { CommunicationController } from './communication.controller';
import { CommunicationService } from './communication.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, CommunicationMessage]), NotificationModule, SecurityModule],
  controllers: [CommunicationController],
  providers: [CommunicationService],
  exports: [CommunicationService],
})
export class CommunicationModule {}
