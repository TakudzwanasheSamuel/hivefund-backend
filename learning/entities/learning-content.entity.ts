import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserProgress } from './user-progress.entity';

export enum LearningContentType {
  VIDEO = 'VIDEO',
  ARTICLE = 'ARTICLE',
  QUIZ = 'QUIZ',
}

export enum LearningLevel {
  BEGINNER = 'Beginner',
  GROWING = 'Growing',
  ESTABLISHED = 'Established',
  TRUSTED = 'Trusted',
}

@Entity('learning_content')
export class LearningContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ nullable: true, type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: LearningContentType,
  })
  type: LearningContentType;

  @Column('int')
  pointsReward: number;

  @Column({ nullable: true })
  url: string;

  @Column({
    type: 'enum',
    enum: LearningLevel,
  })
  level: LearningLevel;

  @Column({ nullable: true })
  topic: string;

  @Column('int', { default: 0 })
  minCreditScore: number;

  @OneToMany(() => UserProgress, (userProgress) => userProgress.learningContent)
  userProgress: UserProgress[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

