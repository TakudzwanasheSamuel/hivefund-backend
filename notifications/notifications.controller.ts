import { Controller, Get, Post, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@GetUser() user: any) {
    return this.notificationsService.findAll(user.userId);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @GetUser() user: any) {
    return this.notificationsService.markAsRead(user.userId, id);
  }

  @ApiBody({ type: SubscribeDto })
  @Post('subscribe')
  subscribe(@Body() subscribeDto: SubscribeDto, @GetUser() user: any) {
    return this.notificationsService.subscribe(user.userId, subscribeDto);
  }
}
