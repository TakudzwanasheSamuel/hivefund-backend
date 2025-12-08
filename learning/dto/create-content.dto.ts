import { IsString, IsNotEmpty, IsNumber, Min, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LearningContentType } from '../entities/learning-content.entity';

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
    example: 'https://example.com/video',
    description: 'Content URL',
    required: false,
  })
  @IsString()
  @IsOptional()
  url?: string;
}

