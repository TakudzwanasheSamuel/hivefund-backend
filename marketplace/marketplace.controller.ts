import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';
import { CreateGigDto } from './dto/create-gig.dto';
import { BookGigDto } from './dto/book-gig.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Marketplace')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('gigs')
  findAll() {
    return this.marketplaceService.findAll();
  }

  @ApiBody({ type: CreateGigDto })
  @Post('gigs')
  createGig(@Body() createGigDto: CreateGigDto, @GetUser() user: any) {
    return this.marketplaceService.createGig(user, createGigDto);
  }

  @ApiBody({ type: BookGigDto })
  @Post('gigs/:id/book')
  bookGig(
    @Param('id') id: string,
    @Body() bookGigDto: BookGigDto,
    @GetUser() user: any,
  ) {
    return this.marketplaceService.bookGig(user, id, bookGigDto);
  }

  @Get('bookings/as-provider')
  getProviderBookings(@GetUser() user: any) {
    return this.marketplaceService.getProviderBookings(user.userId);
  }
}
