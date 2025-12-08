import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreateStoreDto } from './dto/create-store.dto';
import { AddProductDto } from './dto/add-product.dto';
import { PlaceOrderDto } from './dto/place-order.dto';
import { Storefront } from './entities/storefront.entity';
import { Product } from './entities/product.entity';
import { Order, OrderStatus } from './entities/order.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class StorefrontService {
  constructor(
    @InjectRepository(Storefront)
    private storefrontRepository: Repository<Storefront>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {}

  async createStore(user: any, dto: CreateStoreDto) {
    // Check if user already has a storefront
    const existingStore = await this.storefrontRepository.findOne({
      where: { userId: user.userId },
    });

    if (existingStore) {
      throw new ConflictException('You already have a storefront');
    }

    // Generate slug from name
    const baseSlug = dto.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Add random 4 characters
    const randomChars = Math.random().toString(36).substring(2, 6);
    const slug = `${baseSlug}-${randomChars}`;

    // Create storefront
    const storefront = this.storefrontRepository.create({
      name: dto.name,
      description: dto.description,
      slug: slug,
      user: { id: user.userId } as User,
    });

    return await this.storefrontRepository.save(storefront);
  }

  async addProduct(user: any, dto: AddProductDto) {
    // Find user's storefront
    const storefront = await this.storefrontRepository.findOne({
      where: { userId: user.userId },
    });

    if (!storefront) {
      throw new NotFoundException('You do not have a storefront. Create one first.');
    }

    // Create product
    const product = this.productRepository.create({
      name: dto.name,
      price: dto.price,
      stock: dto.stock,
      storefront: storefront,
    });

    return await this.productRepository.save(product);
  }

  async getPublicView(slug: string) {
    const storefront = await this.storefrontRepository.findOne({
      where: { slug },
      relations: ['products'],
    });

    if (!storefront) {
      throw new NotFoundException('Storefront not found');
    }

    return storefront;
  }

  async placeOrder(storeId: string, dto: PlaceOrderDto) {
    // Fetch the storefront
    const storefront = await this.storefrontRepository.findOne({
      where: { id: storeId },
    });

    if (!storefront) {
      throw new NotFoundException('Storefront not found');
    }

    // Fetch products from IDs
    const products = await this.productRepository.find({
      where: {
        id: In(dto.productIds),
        storefrontId: storeId,
      },
    });

    if (products.length !== dto.productIds.length) {
      throw new BadRequestException('One or more products not found');
    }

    // Check stock availability
    for (const product of products) {
      if (product.stock < 1) {
        throw new BadRequestException(
          `Product "${product.name}" is out of stock`,
        );
      }
    }

    // Calculate total sum
    const total = products.reduce((sum, product) => sum + Number(product.price), 0);

    // Create Order
    const order = this.orderRepository.create({
      storefront: storefront,
      total: total,
      status: OrderStatus.PENDING,
      customerPhone: dto.customerPhone,
    });

    const savedOrder = await this.orderRepository.save(order);

    // Decrement stock by 1 for each product (Hackathon logic)
    for (const product of products) {
      product.stock = product.stock - 1;
      await this.productRepository.save(product);
    }

    return {
      order: savedOrder,
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
      })),
      total: total,
    };
  }

  async getAnalytics(user: any) {
    // Find user's storefront
    const storefront = await this.storefrontRepository.findOne({
      where: { userId: user.userId },
      relations: ['orders', 'products'],
    });

    if (!storefront) {
      throw new NotFoundException('You do not have a storefront');
    }

    // Calculate total revenue (sum of completed orders)
    const completedOrders = storefront.orders?.filter(
      (order) => order.status === OrderStatus.COMPLETED,
    ) || [];
    const totalRevenue = completedOrders.reduce(
      (sum, order) => sum + Number(order.total),
      0,
    );

    // Total orders count
    const totalOrders = storefront.orders?.length || 0;

    // Low stock count (products with stock < 5)
    const lowStock = storefront.products?.filter((product) => product.stock < 5).length || 0;

    return {
      storefrontId: storefront.id,
      storefrontName: storefront.name,
      totalRevenue: totalRevenue,
      totalOrders: totalOrders,
      lowStock: lowStock,
      totalProducts: storefront.products?.length || 0,
    };
  }
}
