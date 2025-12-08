import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateGigDto } from './dto/create-gig.dto';
import { BookGigDto } from './dto/book-gig.dto';
import { Gig, GigStatus } from './entities/gig.entity';
import { Booking, BookingStatus } from './entities/booking.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectRepository(Gig)
    private gigRepository: Repository<Gig>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
  ) {}

  async createGig(user: any, dto: CreateGigDto) {
    const gig = this.gigRepository.create({
      title: dto.title,
      description: dto.description,
      price: dto.price,
      category: dto.category,
      status: GigStatus.OPEN,
      provider: { id: user.userId } as User,
    });

    return await this.gigRepository.save(gig);
  }

  async findAll() {
    const gigs = await this.gigRepository.find({
      where: { status: GigStatus.OPEN },
      relations: ['provider'],
      order: { createdAt: 'DESC' },
    });

    return gigs;
  }

  async bookGig(user: any, gigId: string, dto: BookGigDto) {
    // Find the Gig
    const gig = await this.gigRepository.findOne({
      where: { id: gigId },
      relations: ['provider'],
    });

    if (!gig) {
      throw new NotFoundException('Gig not found');
    }

    // Validation: Prevent the provider from booking their own gig
    if (gig.providerId === user.userId) {
      throw new ForbiddenException('You cannot book your own gig');
    }

    // Create Booking
    const booking = this.bookingRepository.create({
      gig: gig,
      customer: { id: user.userId } as User,
      bookingDate: new Date(dto.bookingDate),
      notes: dto.notes,
      status: BookingStatus.PENDING,
    });

    const savedBooking = await this.bookingRepository.save(booking);

    // Return booking with relations
    return await this.bookingRepository.findOne({
      where: { id: savedBooking.id },
      relations: ['gig', 'gig.provider', 'customer'],
    });
  }

  async getProviderBookings(userId: string) {
    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.gig', 'gig')
      .leftJoinAndSelect('gig.provider', 'provider')
      .leftJoinAndSelect('booking.customer', 'customer')
      .where('gig.providerId = :userId', { userId })
      .orderBy('booking.createdAt', 'DESC')
      .getMany();

    return bookings;
  }
}
