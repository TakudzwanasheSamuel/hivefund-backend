import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoansService } from './loans.service';
import { LoansController } from './loans.controller';
import { Loan } from './entities/loan.entity';
import { LiquidityPool } from './entities/liquidity-pool.entity';
import { CreditScore } from '../credit/entities/credit-score.entity';
import { Transaction } from '../payments/entities/transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Loan,
      LiquidityPool,
      CreditScore,
      Transaction,
    ]),
  ],
  controllers: [LoansController],
  providers: [LoansService],
  exports: [LoansService],
})
export class LoansModule {}
