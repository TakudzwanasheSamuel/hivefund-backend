import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearningService } from './learning.service';
import { LearningController } from './learning.controller';
import { LearningContent } from './entities/learning-content.entity';
import { UserProgress } from './entities/user-progress.entity';
import { CreditModule } from '../credit/credit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LearningContent, UserProgress]),
    CreditModule,
  ],
  controllers: [LearningController],
  providers: [LearningService],
  exports: [LearningService],
})
export class LearningModule {}
