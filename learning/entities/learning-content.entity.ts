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

@Entity('learning_content')
export class LearningContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: LearningContentType,
  })
  type: LearningContentType;

  @Column('int')
  pointsReward: number;

  @Column({ nullable: true })
  url: string;

  @OneToMany(() => UserProgress, (userProgress) => userProgress.learningContent)
  userProgress: UserProgress[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

