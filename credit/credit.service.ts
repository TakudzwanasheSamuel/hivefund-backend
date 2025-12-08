import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCreditDto } from './dto/create-credit.dto';
import { UpdateCreditDto } from './dto/update-credit.dto';
import { CreditScore } from './entities/credit-score.entity';
import { CreditHistory } from './entities/credit-history.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class CreditService {
  constructor(
    @InjectRepository(CreditScore)
    private creditScoreRepository: Repository<CreditScore>,
    @InjectRepository(CreditHistory)
    private creditHistoryRepository: Repository<CreditHistory>,
  ) {}

  async getCreditScore(userId: string) {
    const creditScore = await this.creditScoreRepository.findOne({
      where: { userId },
    });

    if (!creditScore) {
      return { score: 0, tier: 'New' };
    }

    return {
      score: creditScore.score,
      tier: creditScore.tier,
    };
  }

  async updateScore(userId: string, reason: string, points: number = 5) {
    // Find or create credit score for user
    let creditScore = await this.creditScoreRepository.findOne({
      where: { userId },
    });

    if (!creditScore) {
      creditScore = this.creditScoreRepository.create({
        user: { id: userId } as User,
        score: 0,
        tier: 'New',
      });
    }

    const scoreBefore = creditScore.score;
    creditScore.score += points;

    // Update tier based on score
    if (creditScore.score >= 500) {
      creditScore.tier = 'Excellent';
    } else if (creditScore.score >= 400) {
      creditScore.tier = 'Good';
    } else if (creditScore.score >= 300) {
      creditScore.tier = 'Growing';
    } else if (creditScore.score >= 200) {
      creditScore.tier = 'Building';
    } else {
      creditScore.tier = 'New';
    }

    await this.creditScoreRepository.save(creditScore);

    // Record in credit history
    const creditHistory = this.creditHistoryRepository.create({
      user: { id: userId } as User,
      scoreBefore,
      scoreAfter: creditScore.score,
      reason,
    });

    await this.creditHistoryRepository.save(creditHistory);

    return creditScore;
  }

  create(createCreditDto: CreateCreditDto) {
    return 'This action adds a new credit';
  }

  findAll() {
    return `This action returns all credit`;
  }

  findOne(id: number) {
    return `This action returns a #${id} credit`;
  }

  update(id: number, updateCreditDto: UpdateCreditDto) {
    return `This action updates a #${id} credit`;
  }

  remove(id: number) {
    return `This action removes a #${id} credit`;
  }
}
