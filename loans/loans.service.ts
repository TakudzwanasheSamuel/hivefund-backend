import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplyLoanDto } from './dto/apply-loan.dto';
import { Loan, LoanStatus } from './entities/loan.entity';
import { CreditScore } from '../credit/entities/credit-score.entity';
import { LiquidityPool } from './entities/liquidity-pool.entity';
import { Transaction, TransactionType, TransactionStatus } from '../payments/entities/transaction.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan)
    private loanRepository: Repository<Loan>,
    @InjectRepository(CreditScore)
    private creditScoreRepository: Repository<CreditScore>,
    @InjectRepository(LiquidityPool)
    private liquidityPoolRepository: Repository<LiquidityPool>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
  ) {}

  async checkEligibility(userId: string) {
    // Fetch user's CreditScore
    const creditScore = await this.creditScoreRepository.findOne({
      where: { userId },
    });

    const currentScore = creditScore?.score || 0;
    let tier: string;
    let maxAmount: number;
    let interestRate: number;

    // Determine tier and limits based on score
    if (currentScore >= 700) {
      tier = 'Trusted';
      maxAmount = 500;
      interestRate = 0.05; // 5%
    } else if (currentScore >= 500) {
      tier = 'Established';
      maxAmount = 200;
      interestRate = 0.10; // 10%
    } else if (currentScore >= 300) {
      tier = 'Growing';
      maxAmount = 50;
      interestRate = 0.15; // 15%
    } else {
      tier = 'Seedling';
      maxAmount = 0;
      interestRate = 0;
    }

    return {
      tier,
      maxAmount,
      interestRate,
      currentScore,
    };
  }

  async apply(dto: ApplyLoanDto, userId: string) {
    // Step 1: Check eligibility
    const eligibility = await this.checkEligibility(userId);

    if (dto.amount > eligibility.maxAmount) {
      throw new ForbiddenException(
        `Loan limit exceeded. Your tier (${eligibility.tier}) allows a maximum of $${eligibility.maxAmount}`,
      );
    }

    if (eligibility.maxAmount === 0) {
      throw new ForbiddenException(
        'You are not eligible for loans. Build your credit score to at least 300 to qualify.',
      );
    }

    // Step 2: Fetch or create LiquidityPool
    let liquidityPool = await this.liquidityPoolRepository.findOne({
      order: { createdAt: 'ASC' },
    });

    if (!liquidityPool) {
      liquidityPool = this.liquidityPoolRepository.create({
        totalPool: 0,
        reservedAmount: 0,
        availableAmount: 0,
      });
      await this.liquidityPoolRepository.save(liquidityPool);
    }

    // Step 3: Check liquidity
    if (Number(liquidityPool.availableAmount) < dto.amount) {
      throw new BadRequestException(
        `Insufficient pool liquidity. Available: $${liquidityPool.availableAmount}, Requested: $${dto.amount}`,
      );
    }

    // Step 4: Calculate repayment
    const interestAmount = dto.amount * eligibility.interestRate;
    const totalRepayable = dto.amount + interestAmount;

    // Step 5: Execute loan
    const tenure = dto.tenure || 1;
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + tenure);

    // Create Loan
    const loan = this.loanRepository.create({
      user: { id: userId } as User,
      amount: dto.amount,
      balance: totalRepayable,
      status: LoanStatus.ACTIVE,
      dueDate: dueDate,
    });

    const savedLoan = await this.loanRepository.save(loan);

    // Decrement LiquidityPool availableAmount
    liquidityPool.availableAmount = Number(liquidityPool.availableAmount) - dto.amount;
    liquidityPool.reservedAmount = Number(liquidityPool.reservedAmount) + totalRepayable;
    await this.liquidityPoolRepository.save(liquidityPool);

    // Create Transaction for loan disbursement
    const transaction = this.transactionRepository.create({
      user: { id: userId } as User,
      amount: dto.amount,
      type: TransactionType.LOAN,
      status: TransactionStatus.COMPLETED,
    });

    await this.transactionRepository.save(transaction);

    return {
      loan: savedLoan,
      transaction: transaction,
      repaymentDetails: {
        principal: dto.amount,
        interest: interestAmount,
        totalRepayable: totalRepayable,
        interestRate: eligibility.interestRate * 100, // Convert to percentage
        dueDate: dueDate,
      },
    };
  }

  async getMyLoans(userId: string) {
    const loans = await this.loanRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return loans;
  }
}
