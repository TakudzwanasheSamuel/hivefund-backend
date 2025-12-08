import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";

// Entities
import { User } from "../users/entities/user.entity";
import { Circle } from "../circles/entities/circle.entity";
import { CircleMember } from "../circles/entities/circle-member.entity";
import { Cycle } from "../circles/entities/cycle.entity";
import { PayoutSchedule } from "../circles/entities/payout-schedule.entity";
import { ExitRequest } from "../circles/entities/exit-request.entity";
import { ExitRequestVote } from "../circles/entities/exit-request-vote.entity";
import { Transaction } from "../payments/entities/transaction.entity";
import { Subscription } from "../payments/entities/subscription.entity";
import { Contribution } from "../payments/entities/contribution.entity";
import { Badge } from "../payments/entities/badge.entity";
import { UserBadge } from "../payments/entities/user-badge.entity";
import { CreditScore } from "../credit/entities/credit-score.entity";
import { CreditHistory } from "../credit/entities/credit-history.entity";
import { Loan } from "../loans/entities/loan.entity";
import { LiquidityPool } from "../loans/entities/liquidity-pool.entity";
import { Storefront } from "../storefront/entities/storefront.entity";
import { Product } from "../storefront/entities/product.entity";
import { Order } from "../storefront/entities/order.entity";
import { Gig } from "../marketplace/entities/gig.entity";
import { Booking } from "../marketplace/entities/booking.entity";
import { Rating } from "../marketplace/entities/rating.entity";
import { LearningContent } from "../learning/entities/learning-content.entity";
import { UserProgress } from "../learning/entities/user-progress.entity";
import { Notification } from "../notifications/entities/notification.entity";
import { PushSubscription } from "../notifications/entities/push-subscription.entity";
import { Session } from "../auth/entities/session.entity";
import { VerificationCode } from "../auth/entities/verification-code.entity";

// Feature Modules
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { CirclesModule } from "../circles/circles.module";
import { PaymentsModule } from "../payments/payments.module";
import { CreditModule } from "../credit/credit.module";
import { LoansModule } from "../loans/loans.module";
import { StorefrontModule } from "../storefront/storefront.module";
import { MarketplaceModule } from "../marketplace/marketplace.module";
import { LearningModule } from "../learning/learning.module";
import { AnalyticsModule } from "../analytics/analytics.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { TasksModule } from "../tasks/tasks.module";

@Module({
    imports: [
        // Task Scheduler (must be imported early)
        ScheduleModule.forRoot(),

        // Load environment variables
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ".env",
        }),

        // TypeORM Configuration
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => {
                // Debug: Log DATABASE_USER to verify .env is being read
                console.log(
                    "DATABASE_USER:",
                    configService.get("DATABASE_USER")
                );

                return {
                    type: "postgres",
                    host: configService.get<string>("DATABASE_HOST"),
                    port: configService.get<number>("DATABASE_PORT"),
                    username: configService.get<string>("DATABASE_USER"),
                    password: configService.get<string>("DATABASE_PASSWORD"),
                    database: configService.get<string>("DATABASE_NAME"),
                    entities: [
                        User,
                        Circle,
                        CircleMember,
                        Cycle,
                        PayoutSchedule,
                        ExitRequest,
                        Transaction,
                        Subscription,
                        Contribution,
                        Badge,
                        UserBadge,
                        CreditScore,
                        CreditHistory,
                        Loan,
                        LiquidityPool,
                        Storefront,
                        Product,
                        Order,
                        Gig,
                        Booking,
                        Rating,
                        LearningContent,
                        UserProgress,
                        Session,
                        VerificationCode,
                    ],
                    synchronize: true, // Auto-sync schema in development mode
                    logging: true, // Log SQL queries in development
                    autoLoadEntities: true, // Automatically load entity files
                };
            },
            inject: [ConfigService],
        }),

        // Feature Modules
        AuthModule,
        UsersModule,
        CirclesModule,
        PaymentsModule,
        CreditModule,
        LoansModule,
        StorefrontModule,
        MarketplaceModule,
        LearningModule,
        AnalyticsModule,
        NotificationsModule,
    ],
})
export class AppModule {}
