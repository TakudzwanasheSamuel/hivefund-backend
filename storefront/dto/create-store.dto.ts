import { IsString, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStoreDto {
  @ApiProperty({
    example: 'Boitu\'s Fashion Hub',
    description: 'Name of the storefront',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Store name must be at least 3 characters' })
  name: string;

  @ApiProperty({
    example: 'Trendy fashion for the modern youth',
    description: 'Store description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}

