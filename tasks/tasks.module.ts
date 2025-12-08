import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { PayoutSchedule } from '../circles/entities/payout-schedule.entity';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PayoutSchedule]),
    PaymentsModule,
  ],
  providers: [TasksService],
})
export class TasksModule {}

