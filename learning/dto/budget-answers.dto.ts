import { IsString, IsNumber, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ExpenseAnswerDto {
  @ApiProperty({
    example: 'Rent',
    description: 'Expense category name',
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
    description: 'Priority: Essential, Important, or Optional',
    required: false,
  })
  @IsString()
  @IsOptional()
  priority?: string;
}

export class BudgetAnswersDto {
  @ApiProperty({
    example: 2000,
    description: 'Monthly income',
  })
  @IsNumber()
  monthlyIncome: number;

  @ApiProperty({
    example: [
      { category: 'Rent', amount: 500, priority: 'Essential' },
      { category: 'Food', amount: 300, priority: 'Essential' },
      { category: 'Transport', amount: 100, priority: 'Important' },
    ],
    description: 'List of monthly expenses',
    type: [ExpenseAnswerDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseAnswerDto)
  expenses: ExpenseAnswerDto[];

  @ApiProperty({
    example: 'I want to save for a laptop and start a small business',
    description: 'Financial goals',
    required: false,
  })
  @IsString()
  @IsOptional()
  financialGoals?: string;

  @ApiProperty({
    example: 'I am interested in starting a jewelry business',
    description: 'Interests or plans',
    required: false,
  })
  @IsString()
  @IsOptional()
  interests?: string;

  @ApiProperty({
    example: 'Monthly Budget',
    description: 'Name for this budget',
    required: false,
  })
  @IsString()
  @IsOptional()
  budgetName?: string;
}

