import { IsString, IsNotEmpty, IsNumber, Min, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LearningContentType, LearningLevel } from '../entities/learning-content.entity';

export class CreateContentDto {
  @ApiProperty({
    example: 'Introduction to Savings',
    description: 'Content title',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'VIDEO',
    description: 'Content type',
    enum: LearningContentType,
  })
  @IsEnum(LearningContentType)
  @IsNotEmpty()
  type: LearningContentType;

  @ApiProperty({
    example: 10,
    description: 'Points awarded for completion',
    minimum: 1,
  })
  @IsNumber()
  @Min(1, { message: 'Points reward must be at least 1' })
  pointsReward: number;

  @ApiProperty({
    example: 'Learn the basics of saving money',
    description: 'Content description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'Detailed text content explaining the topic...',
    description: 'Full text content for the lesson',
    required: false,
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({
    example: 'https://example.com/video',
    description: 'Content URL',
    required: false,
  })
  @IsString()
  @IsOptional()
  url?: string;

  @ApiProperty({
    example: 'Beginner',
    description: 'Learning level',
    enum: LearningLevel,
  })
  @IsEnum(LearningLevel)
  @IsNotEmpty()
  level: LearningLevel;

  @ApiProperty({
    example: 'Mukando Basics',
    description: 'Content topic/category',
    required: false,
  })
  @IsString()
  @IsOptional()
  topic?: string;

  @ApiProperty({
    example: 0,
    description: 'Minimum credit score required to access this content',
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  minCreditScore?: number;
}

