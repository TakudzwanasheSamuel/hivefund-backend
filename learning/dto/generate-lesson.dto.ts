import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LearningLevel } from '../entities/learning-content.entity';

export class GenerateLessonDto {
  @ApiProperty({
    example: 'How Mukando Works',
    description: 'The topic or title of the lesson to generate',
  })
  @IsString()
  @IsNotEmpty()
  topic: string;

  @ApiProperty({
    example: 'Beginner',
    description: 'The difficulty level for the lesson',
    enum: LearningLevel,
    required: false,
  })
  @IsEnum(LearningLevel)
  @IsOptional()
  difficultyLevel?: LearningLevel;

  @ApiProperty({
    example: 'Learn the fundamentals of rotating savings groups',
    description: 'Optional specific learning goals or focus areas',
    required: false,
  })
  @IsString()
  @IsOptional()
  learningGoals?: string;
}

