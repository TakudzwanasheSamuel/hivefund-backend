import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorefrontService } from './storefront.service';
import { StorefrontController } from './storefront.controller';
import { Storefront } from './entities/storefront.entity';
import { Product } from './entities/product.entity';
import { Order } from './entities/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Storefront, Product, Order]),
  ],
  controllers: [StorefrontController],
  providers: [StorefrontService],
  exports: [StorefrontService],
})
export class StorefrontModule {}
