import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  // ==========================================
  // Get My Notifications
  // ==========================================
  @Get()
  getMyNotifications(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isRead') isRead?: string,
  ) {
    const userId = req.user.sub;
    const isReadFilter =
      isRead === undefined
        ? undefined
        : isRead === 'true'
          ? true
          : isRead === 'false'
            ? false
            : undefined;

    return this.notifications.findByUser(
      userId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      isReadFilter,
    );
  }

  // ==========================================
  // Get Unread Count
  // ==========================================
  @Get('unread-count')
  getUnreadCount(@Req() req: any) {
    return this.notifications.getUnreadCount(req.user.sub);
  }

  // ==========================================
  // Mark as Read
  // ==========================================
  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @Req() req: any) {
    return this.notifications.markAsRead(Number(id), req.user.sub);
  }

  // ==========================================
  // Mark All as Read
  // ==========================================
  @Patch('mark-all-read')
  markAllAsRead(@Req() req: any) {
    return this.notifications.markAllAsRead(req.user.sub);
  }

  // ==========================================
  // Delete Notification
  // ==========================================
  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: any) {
    return this.notifications.delete(Number(id), req.user.sub);
  }
}
