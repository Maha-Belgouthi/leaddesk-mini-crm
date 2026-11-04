import {
  Controller,
  Get,
  Patch,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for currently authenticated user' })
  findMyNotifications(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.findByRecipient(user.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count for badge display' })
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser): Promise<{ count: number }> {
    const count = await this.notificationsService.countUnread(user.id);
    return { count };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark specific notification as read' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Marked as read' })
  async markAsRead(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.notificationsService.markAsRead(id);
    return { success: true };
  }
}
