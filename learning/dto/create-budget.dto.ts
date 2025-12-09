import { IsString, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ExpenseItemDto {
  @ApiProperty({
    example: 'Rent',
    description: 'Name of the expense category',
  })
  @IsString()
  category: string;

  @ApiProperty({
    example: 500,
    description: 'Monthly amount for this expense',
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    example: 'Essential',
    description: 'Priority level: Essential, Important, or Optional',
    required: false,
  })
  @IsString()
  @IsOptional()
  priority?: string;
}

export class CreateBudgetDto {
  @ApiProperty({
    example: 'Monthly Budget',
    description: 'Name for this budget',
    required: false,
  })
  @IsString()
  @IsOptional()
  budgetName?: string;

  @ApiProperty({
    example: [
      { category: 'Rent', amount: 500, priority: 'Essential' },
      { category: 'Food', amount: 300, priority: 'Essential' },
      { category: 'Transport', amount: 100, priority: 'Important' },
    ],
    description: 'List of expenses (optional - can be provided or AI will ask)',
    required: false,
    type: [ExpenseItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseItemDto)
  @IsOptional()
  expenses?: ExpenseItemDto[];

  @ApiProperty({
    example: 2000,
    description: 'Monthly income (optional - can be provided or AI will ask)',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  monthlyIncome?: number;

  @ApiProperty({
    example: 'I want to save for a laptop',
    description: 'Financial goals or interests (optional - AI will ask if not provided)',
    required: false,
  })
  @IsString()
  @IsOptional()
  financialGoals?: string;

  @ApiProperty({
    example: 'I am interested in starting a small business',
    description: 'Interests or plans (optional - AI will ask if not provided)',
    required: false,
  })
  @IsString()
  @IsOptional()
  interests?: string;
}

