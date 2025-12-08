import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { StorefrontService } from './storefront.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { AddProductDto } from './dto/add-product.dto';
import { PlaceOrderDto } from './dto/place-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Storefront')
@Controller('storefronts')
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: CreateStoreDto })
  @Post()
  createStore(@Body() createStoreDto: CreateStoreDto, @GetUser() user: any) {
    return this.storefrontService.createStore(user, createStoreDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: AddProductDto })
  @Post('products')
  addProduct(@Body() addProductDto: AddProductDto, @GetUser() user: any) {
    return this.storefrontService.addProduct(user, addProductDto);
  }

  @Get('public/:slug')
  getPublicView(@Param('slug') slug: string) {
    return this.storefrontService.getPublicView(slug);
  }

  @ApiBody({ type: PlaceOrderDto })
  @Post(':id/orders')
  placeOrder(@Param('id') id: string, @Body() placeOrderDto: PlaceOrderDto) {
    return this.storefrontService.placeOrder(id, placeOrderDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('analytics')
  getAnalytics(@GetUser() user: any) {
    return this.storefrontService.getAnalytics(user);
  }
}
