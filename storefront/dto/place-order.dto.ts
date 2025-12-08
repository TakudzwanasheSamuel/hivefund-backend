import { IsArray, IsString, IsNotEmpty, IsUUID, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PlaceOrderDto {
  @ApiProperty({
    example: ['product-uuid-1', 'product-uuid-2'],
    description: 'Array of product IDs to order',
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true, message: 'Each product ID must be a valid UUID' })
  @IsNotEmpty()
  productIds: string[];

  @ApiProperty({
    example: '+263770000000',
    description: 'Customer phone number',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+263\d{9}$/, {
    message: 'Phone number must be in format +263XXXXXXXXX',
  })
  customerPhone: string;
}

