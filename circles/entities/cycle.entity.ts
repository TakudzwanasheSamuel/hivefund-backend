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
import { Circle } from './circle.entity';
import { PayoutSchedule } from './payout-schedule.entity';

export enum CycleStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('cycles')
export class Cycle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('int')
  cycleNumber: number;

  @Column({ type: 'timestamptz' })
  startDate: Date;

  @Column({ type: 'timestamptz' })
  endDate: Date;

  @Column({
    type: 'enum',
    enum: CycleStatus,
    default: CycleStatus.ACTIVE,
  })
  status: CycleStatus;

  @ManyToOne(() => Circle)
  @JoinColumn({ name: 'circleId' })
  circle: Circle;

  @Column()
  circleId: string;

  @OneToMany(() => PayoutSchedule, (payoutSchedule) => payoutSchedule.cycle)
  payoutSchedules: PayoutSchedule[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

