import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { User } from '../user/user.entity';
import { CommunicationService } from './communication.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('communications')
@UseGuards(JwtAuthGuard)
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  @Get('mentions')
  mentionOptions() {
    return this.communicationService.mentionOptions();
  }

  @Get()
  findForUser(@CurrentUser() user: User, @Query('conversationKey') conversationKey?: string) {
    return this.communicationService.findForUser(user, conversationKey);
  }

  @Get('threads')
  findThreads(@CurrentUser() user: User) {
    return this.communicationService.findThreads(user);
  }

  @Patch('threads/:conversationKey/read')
  markThreadRead(@Param('conversationKey') conversationKey: string, @CurrentUser() user: User) {
    return this.communicationService.markThreadRead(conversationKey, user);
  }

  @Post()
  sendMessage(@Body() dto: SendMessageDto, @CurrentUser() user: User) {
    return this.communicationService.sendMessage(dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.communicationService.remove(id, user);
  }
}
