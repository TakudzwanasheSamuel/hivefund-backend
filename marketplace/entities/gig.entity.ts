import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Booking } from './booking.entity';
import { Rating } from './rating.entity';

export enum GigStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

@Entity('gigs')
export class Gig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column()
  category: string;

  @Column({
    type: 'enum',
    enum: GigStatus,
    default: GigStatus.OPEN,
  })
  status: GigStatus;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'providerId' })
  provider: User;

  @Column()
  providerId: string;

  @OneToMany(() => Booking, (booking) => booking.gig)
  bookings: Booking[];

  @OneToMany(() => Rating, (rating) => rating.gig)
  ratings: Rating[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

