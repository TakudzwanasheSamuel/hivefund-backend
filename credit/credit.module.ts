import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditService } from './credit.service';
import { CreditController } from './credit.controller';
import { CreditScore } from './entities/credit-score.entity';
import { CreditHistory } from './entities/credit-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CreditScore, CreditHistory])],
  controllers: [CreditController],
  providers: [CreditService],
  exports: [CreditService],
})
export class CreditModule {}
