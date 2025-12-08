import { IsString, IsNotEmpty, IsNumber, Min, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddProductDto {
  @ApiProperty({
    example: 'Designer T-Shirt',
    description: 'Product name',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 25.99,
    description: 'Product price',
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01, { message: 'Price must be greater than 0' })
  price: number;

  @ApiProperty({
    example: 50,
    description: 'Stock quantity',
    minimum: 0,
  })
  @IsInt()
  @Min(0, { message: 'Stock cannot be negative' })
  stock: number;
}

