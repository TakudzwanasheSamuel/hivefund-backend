import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PayoutSchedule } from '../circles/entities/payout-schedule.entity';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(PayoutSchedule)
    private payoutScheduleRepository: Repository<PayoutSchedule>,
    private paymentsService: PaymentsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyCharges() {
    this.logger.log('Starting daily charge processing...');

    // Get today's date range (start and end of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find all PayoutSchedule records where scheduledDate = TODAY and status = 'PENDING'
    const pendingSchedules = await this.payoutScheduleRepository.find({
      where: {
        scheduledDate: Between(today, tomorrow),
        status: 'PENDING',
      },
      relations: ['user'],
    });

    this.logger.log(`Found ${pendingSchedules.length} pending payments for today`);

    let processedCount = 0;
    let failedCount = 0;

    // Loop through them and call paymentsService.processContribution()
    for (const schedule of pendingSchedules) {
      try {
        await this.paymentsService.processContribution(
          schedule.userId,
          schedule.amount,
        );
        processedCount++;
        this.logger.log(
          `Processed contribution for user ${schedule.userId}: $${schedule.amount}`,
        );
      } catch (error) {
        failedCount++;
        this.logger.error(
          `Failed to process contribution for user ${schedule.userId}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Daily charge processing complete. Processed: ${processedCount}, Failed: ${failedCount}`,
    );
  }
}

