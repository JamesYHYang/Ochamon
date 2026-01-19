import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MessagingService } from './messaging.service';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';

@ApiTags('Messaging')
@ApiBearerAuth()
@Controller('messaging')
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get('rfq/:rfqId')
  @ApiOperation({ summary: 'Get messages for RFQ thread' })
  async getMessages(
    @CurrentUser() user: { id: string },
    @Param('rfqId') rfqId: string,
  ) {
    return this.messagingService.getMessages(user.id, rfqId);
  }

  @Post('rfq/:rfqId')
  @ApiOperation({ summary: 'Send message in RFQ thread' })
  async sendMessage(
    @CurrentUser() user: { id: string },
    @Param('rfqId') rfqId: string,
    @Body('body') body: string,
  ) {
    return this.messagingService.sendMessage(user.id, rfqId, body);
  }
}
