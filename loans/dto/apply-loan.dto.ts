import { IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApplyLoanDto {
  @ApiProperty({
    example: 50,
    description: 'Loan amount (minimum $5)',
    minimum: 5,
  })
  @IsNumber()
  @Min(5, { message: 'Loan amount must be at least $5' })
  amount: number;

  @ApiProperty({
    example: 1,
    description: 'Loan tenure in months',
    default: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1, { message: 'Tenure must be at least 1 month' })
  tenure?: number;
}

