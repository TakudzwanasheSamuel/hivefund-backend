import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Transaction } from './entities/transaction.entity';
import { Subscription } from './entities/subscription.entity';
import { Contribution } from './entities/contribution.entity';
import { Badge } from './entities/badge.entity';
import { UserBadge } from './entities/user-badge.entity';
import { CreditModule } from '../credit/credit.module';
import { PayoutSchedule } from '../circles/entities/payout-schedule.entity';
import { LiquidityPool } from '../loans/entities/liquidity-pool.entity';
import { Cycle } from '../circles/entities/cycle.entity';
import { Circle } from '../circles/entities/circle.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transaction,
      Subscription,
      Contribution,
      Badge,
      UserBadge,
      PayoutSchedule,
      LiquidityPool,
      Cycle,
      Circle,
    ]),
    CreditModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
