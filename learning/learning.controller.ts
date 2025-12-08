import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { LearningService } from './learning.service';
import { CreateContentDto } from './dto/create-content.dto';
import { CompleteModuleDto } from './dto/complete-module.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Learning')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('learning')
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @ApiBody({ type: CreateContentDto })
  @Post('content')
  createContent(@Body() createContentDto: CreateContentDto) {
    return this.learningService.createContent(createContentDto);
  }

  @Get('content')
  getAllContent() {
    return this.learningService.getAllContent();
  }

  @ApiBody({ type: CompleteModuleDto })
  @Post('progress')
  markComplete(@Body() completeModuleDto: CompleteModuleDto, @GetUser() user: any) {
    return this.learningService.markComplete(user, completeModuleDto);
  }

  @Get('my-progress')
  getUserProgress(@GetUser() user: any) {
    return this.learningService.getUserProgress(user.userId);
  }
}
