import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CirclesService } from "./circles.service";
import { CirclesController } from "./circles.controller";
import { Circle } from "./entities/circle.entity";
import { CircleMember } from "./entities/circle-member.entity";
import { Cycle } from "./entities/cycle.entity";
import { PayoutSchedule } from "./entities/payout-schedule.entity";
import { ExitRequest } from "./entities/exit-request.entity";
import { ExitRequestVote } from "./entities/exit-request-vote.entity";
import { User } from "../users/entities/user.entity";
import { PaymentsModule } from "../payments/payments.module";

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Circle,
            CircleMember,
            Cycle,
            PayoutSchedule,
            ExitRequest,
            ExitRequestVote,
            User,
        ]),
        forwardRef(() => PaymentsModule),
    ],
    controllers: [CirclesController],
    providers: [CirclesService],
    exports: [CirclesService],
})
export class CirclesModule {}
