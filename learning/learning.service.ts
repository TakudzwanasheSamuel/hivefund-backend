import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateContentDto } from './dto/create-content.dto';
import { CompleteModuleDto } from './dto/complete-module.dto';
import { LearningContent } from './entities/learning-content.entity';
import { UserProgress } from './entities/user-progress.entity';
import { CreditService } from '../credit/credit.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class LearningService {
  constructor(
    @InjectRepository(LearningContent)
    private learningContentRepository: Repository<LearningContent>,
    @InjectRepository(UserProgress)
    private userProgressRepository: Repository<UserProgress>,
    private creditService: CreditService,
  ) {}

  async getAllContent() {
    const content = await this.learningContentRepository.find({
      order: { pointsReward: 'ASC' },
    });

    return content;
  }

  async createContent(dto: CreateContentDto) {
    const content = this.learningContentRepository.create({
      title: dto.title,
      description: dto.description,
      type: dto.type,
      pointsReward: dto.pointsReward,
      url: dto.url,
    });

    return await this.learningContentRepository.save(content);
  }

  async markComplete(user: any, dto: CompleteModuleDto) {
    // Check if content exists
    const content = await this.learningContentRepository.findOne({
      where: { id: dto.contentId },
    });

    if (!content) {
      throw new NotFoundException('Learning content not found');
    }

    // Check if UserProgress already exists (prevent double-dipping)
    const existingProgress = await this.userProgressRepository.findOne({
      where: {
        userId: user.userId,
        learningContentId: dto.contentId,
      },
    });

    if (existingProgress) {
      throw new BadRequestException('You have already completed this module');
    }

    // Create UserProgress
    const progress = this.userProgressRepository.create({
      user: { id: user.userId } as User,
      learningContent: content,
      completedAt: new Date(),
    });

    await this.userProgressRepository.save(progress);

    // Award points via CreditService
    await this.creditService.updateScore(
      user.userId,
      'learning_complete',
      content.pointsReward,
    );

    return {
      message: 'Module completed successfully!',
      pointsEarned: content.pointsReward,
      contentTitle: content.title,
    };
  }

  async getUserProgress(userId: string) {
    const progressList = await this.userProgressRepository.find({
      where: { userId },
      relations: ['learningContent'],
      order: { completedAt: 'DESC' },
    });

    // Calculate total points earned
    const totalPointsEarned = progressList.reduce(
      (sum, progress) => sum + progress.learningContent.pointsReward,
      0,
    );

    return {
      completedModules: progressList.map((progress) => ({
        id: progress.id,
        contentId: progress.learningContent.id,
        title: progress.learningContent.title,
        type: progress.learningContent.type,
        pointsReward: progress.learningContent.pointsReward,
        completedAt: progress.completedAt,
      })),
      totalPointsEarned: totalPointsEarned,
      totalModulesCompleted: progressList.length,
    };
  }
}
