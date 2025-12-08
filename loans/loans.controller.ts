import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { LoansService } from './loans.service';
import { ApplyLoanDto } from './dto/apply-loan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Loans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Get('eligibility')
  checkEligibility(@GetUser() user: any) {
    return this.loansService.checkEligibility(user.userId);
  }

  @ApiBody({ type: ApplyLoanDto })
  @Post('apply')
  apply(@Body() applyLoanDto: ApplyLoanDto, @GetUser() user: any) {
    return this.loansService.apply(applyLoanDto, user.userId);
  }

  @Get('my-loans')
  getMyLoans(@GetUser() user: any) {
    return this.loansService.getMyLoans(user.userId);
  }
}
