import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGigDto {
  @ApiProperty({
    example: 'Graphic Design Services',
    description: 'Gig title',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Professional logo design and branding services',
    description: 'Gig description',
    required: false,
  })
  @IsString()
  description?: string;

  @ApiProperty({
    example: 50.00,
    description: 'Price per gig',
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01, { message: 'Price must be greater than 0' })
  price: number;

  @ApiProperty({
    example: 'Design',
    description: 'Gig category',
  })
  @IsString()
  @IsNotEmpty()
  category: string;
}

