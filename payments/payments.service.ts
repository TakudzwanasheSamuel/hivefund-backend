import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Subscription, SubscriptionStatus } from './entities/subscription.entity';
import { Transaction, TransactionType, TransactionStatus } from './entities/transaction.entity';
import { User } from '../users/entities/user.entity';
import { Circle } from '../circles/entities/circle.entity';
import { CreditService } from '../credit/credit.service';
import { PayoutSchedule } from '../circles/entities/payout-schedule.entity';
import { LiquidityPool } from '../loans/entities/liquidity-pool.entity';
import { Cycle, CycleStatus } from '../circles/entities/cycle.entity';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(PayoutSchedule)
    private payoutScheduleRepository: Repository<PayoutSchedule>,
    @InjectRepository(LiquidityPool)
    private liquidityPoolRepository: Repository<LiquidityPool>,
    @InjectRepository(Cycle)
    private cycleRepository: Repository<Cycle>,
    @InjectRepository(Circle)
    private circleRepository: Repository<Circle>,
    private creditService: CreditService,
  ) {}

  async createSubscription(
    user: User | string,
    circle: Circle | string,
  ) {
    // Extract user ID
    const userId = typeof user === 'string' ? user : user.id;
    // Extract circle ID
    const circleId = typeof circle === 'string' ? circle : circle.id;

    // Check if subscription already exists
    const existingSubscription = await this.subscriptionRepository.findOne({
      where: {
        userId: userId,
        circleId: circleId,
      },
    });

    if (existingSubscription) {
      // If subscription exists and is cancelled, reactivate it
      if (existingSubscription.status === SubscriptionStatus.CANCELLED) {
        existingSubscription.status = SubscriptionStatus.ACTIVE;
        existingSubscription.cancelledAt = null;
        return await this.subscriptionRepository.save(existingSubscription);
      }
      // Otherwise return existing active subscription
      return existingSubscription;
    }

    // Create new subscription
    const subscription = this.subscriptionRepository.create({
      user: { id: userId } as User,
      circle: { id: circleId } as Circle,
      status: SubscriptionStatus.ACTIVE,
    });

    return await this.subscriptionRepository.save(subscription);
  }

  async processContribution(userId: string, amount: number) {
    // Simulate EcoCash payment (assume success in hackathon mode)
    // In production, this would call the actual EcoCash API

    // Record Transaction
    const transaction = this.transactionRepository.create({
      user: { id: userId } as User,
      amount: amount,
      type: TransactionType.CONTRIBUTION,
      status: TransactionStatus.COMPLETED,
    });

    const savedTransaction = await this.transactionRepository.save(transaction);

    // 1. Feed the Liquidity Pool
    let liquidityPool = await this.liquidityPoolRepository.findOne({
      order: { createdAt: 'ASC' },
    });

    if (!liquidityPool) {
      // Create default pool if it doesn't exist
      liquidityPool = this.liquidityPoolRepository.create({
        totalPool: 0,
        reservedAmount: 0,
        availableAmount: 0,
      });
    }

    // Increment availableAmount by the contribution amount
    liquidityPool.availableAmount = Number(liquidityPool.availableAmount) + Number(amount);
    liquidityPool.totalPool = Number(liquidityPool.totalPool) + Number(amount);
    await this.liquidityPoolRepository.save(liquidityPool);

    // Update PayoutSchedule: Find pending schedules for this user today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const pendingSchedules = await this.payoutScheduleRepository.find({
      where: {
        userId: userId,
        scheduledDate: Between(today, tomorrow),
        status: 'PENDING',
      },
      relations: ['cycle'],
    });

    let cycleCompleted = false;
    let completedCycleId: string | null = null;

    // Update all pending schedules for today to PAID
    for (const schedule of pendingSchedules) {
      schedule.status = 'PAID';
      await this.payoutScheduleRepository.save(schedule);

      // 2. Check for Cycle Completion
      if (schedule.cycleId) {
        // Check if all schedules for this cycle are now PAID
        const allSchedules = await this.payoutScheduleRepository.find({
          where: { cycleId: schedule.cycleId },
        });

        const allPaid = allSchedules.every((s) => s.status === 'PAID');

        if (allPaid && !cycleCompleted) {
          cycleCompleted = true;
          completedCycleId = schedule.cycleId;

          // Update Cycle - Note: Cycle entity doesn't have status field
          // We can track completion via all schedules being paid
          // If you need cycle status, consider adding it to the Cycle entity
          const cycle = await this.cycleRepository.findOne({
            where: { id: schedule.cycleId },
          });

          if (cycle) {
            // Update Cycle status to COMPLETED
            cycle.status = CycleStatus.COMPLETED;
            await this.cycleRepository.save(cycle);

            // Log cycle completion
            this.logger.log(`Cycle Completed! Cycle ID: ${cycle.id}`);

            // Give bonus points for cycle completion (+50 points)
            await this.creditService.updateScore(userId, 'cycle_complete', 50);
          }
        }
      }
    }

    // Boost Score: Call credit service to update score (+5 points for on-time payment)
    await this.creditService.updateScore(userId, 'on_time_payment', 5);

    return {
      transaction: savedTransaction,
      schedulesUpdated: pendingSchedules.length,
      liquidityPoolUpdated: true,
      cycleCompleted: cycleCompleted,
      message: 'Contribution processed successfully',
    };
  }

  create(createPaymentDto: CreatePaymentDto) {
    return 'This action adds a new payment';
  }

  findAll() {
    return `This action returns all payments`;
  }

  findOne(id: number) {
    return `This action returns a #${id} payment`;
  }

  update(id: number, updatePaymentDto: UpdatePaymentDto) {
    return `This action updates a #${id} payment`;
  }

  remove(id: number) {
    return `This action removes a #${id} payment`;
  }
}
