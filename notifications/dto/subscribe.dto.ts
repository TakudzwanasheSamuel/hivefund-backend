import { IsString, IsNotEmpty, IsObject, ValidateNested, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class PushKeysDto {
  @ApiProperty({
    example: 'BNJxwjiC...',
    description: 'P256DH key for push encryption',
  })
  @IsString()
  @IsNotEmpty()
  p256dh: string;

  @ApiProperty({
    example: 'x8Z3mK2...',
    description: 'Auth key for push encryption',
  })
  @IsString()
  @IsNotEmpty()
  auth: string;
}

export class SubscribeDto {
  @ApiProperty({
    example: 'https://fcm.googleapis.com/fcm/send/...',
    description: 'Push subscription endpoint URL',
  })
  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @ApiProperty({
    example: { p256dh: 'BNJxwjiC...', auth: 'x8Z3mK2...' },
    description: 'Push subscription keys',
    type: PushKeysDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => PushKeysDto)
  keys: PushKeysDto;

  @ApiProperty({
    example: '2024-12-31T23:59:59Z',
    description: 'Subscription expiration time (optional)',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  expirationTime?: string;
}

