import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AskQuestionDto {
  @ApiProperty({
    example: 'How do I increase my credit score faster?',
    description: 'The question the user wants answered',
  })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({
    example: 'I have a credit score of 250 and want to reach 300',
    description: 'Optional context about the user\'s situation to provide more relevant answers',
    required: false,
  })
  @IsString()
  @IsOptional()
  context?: string;
}

