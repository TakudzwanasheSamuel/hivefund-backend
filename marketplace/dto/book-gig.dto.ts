import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BookGigDto {
  @ApiProperty({
    example: '2024-12-15T10:00:00Z',
    description: 'Booking date in ISO format',
  })
  @IsDateString()
  bookingDate: string;

  @ApiProperty({
    example: 'Need this completed by end of week',
    description: 'Additional notes for the booking',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

