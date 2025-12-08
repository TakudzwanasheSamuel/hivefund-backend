import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompleteModuleDto {
  @ApiProperty({
    example: 'content-uuid-here',
    description: 'Learning content ID to mark as complete',
  })
  @IsUUID('4', { message: 'Content ID must be a valid UUID' })
  @IsNotEmpty()
  contentId: string;
}

