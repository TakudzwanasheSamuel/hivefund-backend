import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
    ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateCircleDto } from "./dto/create-circle.dto";
import { JoinCircleDto } from "./dto/join-circle.dto";
import { CreateExitRequestDto } from "./dto/create-exit-request.dto";
import { VoteExitRequestDto } from "./dto/vote-exit-request.dto";
import { Circle, CircleStatus } from "./entities/circle.entity";
import {
    CircleMember,
    CircleMemberStatus,
} from "./entities/circle-member.entity";
import { Cycle, CycleStatus } from "./entities/cycle.entity";
import { PayoutSchedule } from "./entities/payout-schedule.entity";
import { ExitRequest, ExitRequestStatus } from "./entities/exit-request.entity";
import { ExitRequestVote } from "./entities/exit-request-vote.entity";
import { User } from "../users/entities/user.entity";
import * as crypto from "crypto";
import { PaymentsService } from "../payments/payments.service";

@Injectable()
export class CirclesService {
    constructor(
        @InjectRepository(Circle)
        private circleRepository: Repository<Circle>,
        @InjectRepository(CircleMember)
        private circleMemberRepository: Repository<CircleMember>,
        @InjectRepository(Cycle)
        private cycleRepository: Repository<Cycle>,
        @InjectRepository(PayoutSchedule)
        private payoutScheduleRepository: Repository<PayoutSchedule>,
        @InjectRepository(ExitRequest)
        private exitRequestRepository: Repository<ExitRequest>,
        @InjectRepository(ExitRequestVote)
        private exitRequestVoteRepository: Repository<ExitRequestVote>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private paymentsService: PaymentsService
    ) {}

    async create(createCircleDto: CreateCircleDto, user: any) {
        // Generate random 6-character invite code
        const inviteCode = this.generateInviteCode();

        // Create the circle
        const circle = this.circleRepository.create({
            ...createCircleDto,
            inviteCode,
        });

        const savedCircle = await this.circleRepository.save(circle);

        // Add creator as first member with payoutPosition: 1
        const creatorMember = this.circleMemberRepository.create({
            user: { id: user.userId } as User,
            circle: savedCircle,
            payoutPosition: 1,
        });

        await this.circleMemberRepository.save(creatorMember);

        // Create subscription for the creator
        const creatorUser = await this.userRepository.findOne({
            where: { id: user.userId },
        });
        await this.paymentsService.createSubscription(creatorUser, savedCircle);

        // Return circle with members
        return this.circleRepository.findOne({
            where: { id: savedCircle.id },
            relations: ["members", "members.user"],
        });
    }

    async join(joinCircleDto: JoinCircleDto, user: any) {
        if (!joinCircleDto.agreedToTerms) {
            throw new BadRequestException(
                "You must agree to the terms to join a circle"
            );
        }

        // Find circle by invite code
        const circle = await this.circleRepository.findOne({
            where: { inviteCode: joinCircleDto.inviteCode },
        });

        if (!circle) {
            throw new NotFoundException(
                "Circle not found with this invite code"
            );
        }

        // Check if user is already a member
        const existingMember = await this.circleMemberRepository.findOne({
            where: {
                circleId: circle.id,
                userId: user.userId,
            },
        });

        if (existingMember) {
            throw new ConflictException(
                "You are already a member of this circle"
            );
        }

        // Count current members
        const memberCount = await this.circleMemberRepository.count({
            where: { circleId: circle.id },
        });

        // Check if circle is full
        if (memberCount >= circle.maxMembers) {
            throw new ConflictException("Circle is full");
        }

        // Add user as member with auto-assigned position
        const newMember = this.circleMemberRepository.create({
            user: { id: user.userId } as User,
            circle: circle,
            payoutPosition: memberCount + 1,
        });

        await this.circleMemberRepository.save(newMember);

        // Create subscription for the new member
        const newMemberUser = await this.userRepository.findOne({
            where: { id: user.userId },
        });
        await this.paymentsService.createSubscription(newMemberUser, circle);

        // Return updated circle with all members
        return this.circleRepository.findOne({
            where: { id: circle.id },
            relations: ["members", "members.user"],
        });
    }

    async findAll(user: any) {
        // Find all circles where user is a member
        const memberships = await this.circleMemberRepository.find({
            where: { userId: user.userId },
            relations: ["circle", "circle.members", "circle.members.user"],
        });

        return memberships.map((membership) => membership.circle);
    }

    async findOne(id: string) {
        const circle = await this.circleRepository.findOne({
            where: { id },
            relations: ["members", "members.user"],
        });

        if (!circle) {
            throw new NotFoundException(`Circle with ID ${id} not found`);
        }

        // Sort members by payoutPosition
        if (circle.members) {
            circle.members.sort((a, b) => a.payoutPosition - b.payoutPosition);
        }

        return circle;
    }

    async startCycle(circleId: string, user: any) {
        // Fetch circle with members
        const circle = await this.circleRepository.findOne({
            where: { id: circleId },
            relations: ["members", "members.user"],
        });

        if (!circle) {
            throw new NotFoundException(`Circle with ID ${circleId} not found`);
        }

        // Check if user is the creator (first member with payoutPosition 1)
        const creatorMember = await this.circleMemberRepository.findOne({
            where: {
                circleId: circle.id,
                userId: user.userId,
                payoutPosition: 1,
            },
        });

        if (!creatorMember) {
            throw new ForbiddenException(
                "Only the circle creator can start a cycle"
            );
        }

        // Check if circle already has an active cycle
        const activeCycle = await this.cycleRepository.findOne({
            where: {
                circleId: circle.id,
            },
            order: { createdAt: "DESC" },
        });

        if (activeCycle) {
            throw new ConflictException("Circle already has an active cycle");
        }

        // Count current members
        const memberCount = await this.circleMemberRepository.count({
            where: { circleId: circle.id },
        });

        // Check minimum members requirement
        const MIN_MEMBERS = 4;
        if (memberCount < MIN_MEMBERS) {
            throw new BadRequestException(
                `Circle must have at least ${MIN_MEMBERS} members to start. Current: ${memberCount}`
            );
        }

        // Fetch all members
        const members = await this.circleMemberRepository.find({
            where: { circleId: circle.id },
            relations: ["user"],
        });

        // Shuffle members array (The "Lottery")
        const shuffledMembers = this.shuffleArray([...members]);

        // Update payout positions based on shuffled order
        for (let i = 0; i < shuffledMembers.length; i++) {
            shuffledMembers[i].payoutPosition = i + 1;
            await this.circleMemberRepository.save(shuffledMembers[i]);
        }

        // Sort by new payout position for schedule generation
        const sortedMembers = shuffledMembers.sort(
            (a, b) => a.payoutPosition - b.payoutPosition
        );

        // Calculate cycle dates
        const startDate = new Date();
        // End date = startDate + (frequency * members)
        // For monthly: endDate = startDate + (memberCount months)
        // For weekly: endDate = startDate + (memberCount weeks)
        const endDate = new Date(startDate);
        if (circle.frequency === "WEEKLY") {
            endDate.setDate(endDate.getDate() + memberCount * 7);
        } else {
            // MONTHLY
            endDate.setMonth(endDate.getMonth() + memberCount);
        }

        // Create Cycle
        const cycle = this.cycleRepository.create({
            circle: circle,
            cycleNumber: 1, // For now, always 1. Can be incremented for subsequent cycles
            startDate: startDate,
            endDate: endDate,
            status: CycleStatus.ACTIVE,
        });

        const savedCycle = await this.cycleRepository.save(cycle);

        // Generate PayoutSchedule for each member
        const payoutSchedules = [];
        const totalAmount = circle.contributionAmount * memberCount;

        for (let i = 0; i < sortedMembers.length; i++) {
            const member = sortedMembers[i];
            const scheduledDate = new Date(startDate);

            // Calculate scheduled date based on frequency
            if (circle.frequency === "WEEKLY") {
                scheduledDate.setDate(scheduledDate.getDate() + i * 7);
            } else {
                // MONTHLY
                scheduledDate.setMonth(scheduledDate.getMonth() + i);
            }

            const payoutSchedule = this.payoutScheduleRepository.create({
                cycle: savedCycle,
                user: member.user,
                scheduledDate: scheduledDate,
                amount: totalAmount,
                status: "PENDING",
            });

            const savedSchedule =
                await this.payoutScheduleRepository.save(payoutSchedule);
            payoutSchedules.push(savedSchedule);
        }

        // Update circle status to ACTIVE and save current cycle
        circle.status = CircleStatus.ACTIVE;
        circle.currentCycleId = savedCycle.id;
        await this.circleRepository.save(circle);

        // Return timeline with member details
        return {
            cycle: savedCycle,
            timeline: payoutSchedules.map((schedule) => ({
                position: sortedMembers.find(
                    (m) => m.userId === schedule.userId
                ).payoutPosition,
                memberName: sortedMembers.find(
                    (m) => m.userId === schedule.userId
                ).user.name,
                scheduledDate: schedule.scheduledDate,
                amount: schedule.amount,
                status: schedule.status,
            })),
        };
    }

    async getCircleByInviteCode(inviteCode: string) {
        const circle = await this.circleRepository.findOne({
            where: { inviteCode },
            relations: ["members", "members.user"],
        });

        if (!circle) {
            throw new NotFoundException(
                "Circle not found with this invite code"
            );
        }

        // Sort members by payoutPosition
        if (circle.members) {
            circle.members.sort((a, b) => a.payoutPosition - b.payoutPosition);
        }

        // Return public preview (hide sensitive info if needed)
        return {
            id: circle.id,
            name: circle.name,
            contributionAmount: circle.contributionAmount,
            frequency: circle.frequency,
            maxMembers: circle.maxMembers,
            currentMembers: circle.members.length,
            status: circle.status,
            inviteCode: circle.inviteCode,
        };
    }

    async getCircleMembers(circleId: string, user: any) {
        const circle = await this.circleRepository.findOne({
            where: { id: circleId },
            relations: ["members", "members.user"],
        });

        if (!circle) {
            throw new NotFoundException(`Circle with ID ${circleId} not found`);
        }

        // Verify user is a member of this circle
        const isMember = await this.circleMemberRepository.findOne({
            where: {
                circleId: circle.id,
                userId: user.userId,
            },
        });

        if (!isMember) {
            throw new ForbiddenException("You are not a member of this circle");
        }

        // Sort members by payoutPosition
        const sortedMembers = circle.members.sort(
            (a, b) => a.payoutPosition - b.payoutPosition
        );

        return sortedMembers.map((member) => ({
            id: member.id,
            name: member.user.name,
            phoneNumber: member.user.phoneNumber,
            payoutPosition: member.payoutPosition,
            status: member.status,
            joinedAt: member.createdAt,
        }));
    }

    async getCircleTimeline(circleId: string, user: any) {
        const circle = await this.circleRepository.findOne({
            where: { id: circleId },
        });

        if (!circle) {
            throw new NotFoundException(`Circle with ID ${circleId} not found`);
        }

        // Verify user is a member of this circle
        const isMember = await this.circleMemberRepository.findOne({
            where: {
                circleId: circle.id,
                userId: user.userId,
            },
        });

        if (!isMember) {
            throw new ForbiddenException("You are not a member of this circle");
        }

        // Get the current cycle
        const cycle = await this.cycleRepository.findOne({
            where: { id: circle.currentCycleId },
            relations: ["payoutSchedules", "payoutSchedules.user"],
        });

        if (!cycle) {
            throw new NotFoundException("Circle has no active cycle yet");
        }

        // Get all members to map positions
        const members = await this.circleMemberRepository.find({
            where: { circleId: circle.id },
            relations: ["user"],
        });

        // Build timeline
        const timeline = cycle.payoutSchedules
            .map((schedule) => {
                const member = members.find(
                    (m) => m.userId === schedule.userId
                );
                return {
                    period: member?.payoutPosition || 0,
                    memberName: schedule.user.name,
                    scheduledDate: schedule.scheduledDate,
                    amount: schedule.amount,
                    status: schedule.status,
                };
            })
            .sort((a, b) => a.period - b.period);

        return {
            circleId: circle.id,
            circleName: circle.name,
            cycleNumber: cycle.cycleNumber,
            startDate: cycle.startDate,
            endDate: cycle.endDate,
            timeline,
        };
    }

    async createExitRequest(
        circleId: string,
        createExitRequestDto: CreateExitRequestDto,
        user: any
    ) {
        // Verify user is a member of this circle
        const member = await this.circleMemberRepository.findOne({
            where: {
                circleId: circleId,
                userId: user.userId,
                status: CircleMemberStatus.ACTIVE,
            },
        });

        if (!member) {
            throw new NotFoundException(
                "You are not an active member of this circle"
            );
        }

        // Check if there's already a pending exit request for this user in this circle
        const existingRequest = await this.exitRequestRepository.findOne({
            where: {
                circleId: circleId,
                userId: user.userId,
                status: ExitRequestStatus.PENDING,
            },
        });

        if (existingRequest) {
            throw new ConflictException(
                "You already have a pending exit request for this circle"
            );
        }

        // Create exit request
        const exitRequest = this.exitRequestRepository.create({
            userId: user.userId,
            circleId: circleId,
            reason: createExitRequestDto.reason || null,
            votesFor: 0,
            votesAgainst: 0,
            status: ExitRequestStatus.PENDING,
        });

        const savedRequest = await this.exitRequestRepository.save(exitRequest);

        return {
            id: savedRequest.id,
            userId: savedRequest.userId,
            circleId: savedRequest.circleId,
            reason: savedRequest.reason,
            status: savedRequest.status,
            votesFor: savedRequest.votesFor,
            votesAgainst: savedRequest.votesAgainst,
            createdAt: savedRequest.createdAt,
        };
    }

    async voteOnExitRequest(
        circleId: string,
        voteExitRequestDto: VoteExitRequestDto,
        user: any
    ) {
        // Verify user is a member of this circle
        const voter = await this.circleMemberRepository.findOne({
            where: {
                circleId: circleId,
                userId: user.userId,
                status: CircleMemberStatus.ACTIVE,
            },
        });

        if (!voter) {
            throw new ForbiddenException(
                "You are not an active member of this circle"
            );
        }

        // Get the exit request
        const exitRequest = await this.exitRequestRepository.findOne({
            where: {
                id: voteExitRequestDto.exitRequestId,
                circleId: circleId,
                status: ExitRequestStatus.PENDING,
            },
        });

        if (!exitRequest) {
            throw new NotFoundException(
                "Exit request not found or already processed"
            );
        }

        // Check if user is trying to vote on their own exit request
        if (exitRequest.userId === user.userId) {
            throw new BadRequestException(
                "You cannot vote on your own exit request"
            );
        }

        // Check if user has already voted
        const existingVote = await this.exitRequestVoteRepository.findOne({
            where: {
                exitRequestId: exitRequest.id,
                userId: user.userId,
            },
        });

        if (existingVote) {
            throw new ConflictException(
                "You have already voted on this exit request"
            );
        }

        // Record the vote
        const vote = this.exitRequestVoteRepository.create({
            exitRequestId: exitRequest.id,
            userId: user.userId,
            vote: voteExitRequestDto.approve,
        });

        await this.exitRequestVoteRepository.save(vote);

        // Update vote counts
        if (voteExitRequestDto.approve) {
            exitRequest.votesFor += 1;
        } else {
            exitRequest.votesAgainst += 1;
        }

        // Get total active members (excluding the person requesting exit)
        const totalMembers = await this.circleMemberRepository.count({
            where: {
                circleId: circleId,
                status: CircleMemberStatus.ACTIVE,
            },
        });

        const eligibleVoters = totalMembers - 1; // Exclude the requester
        const totalVotes = exitRequest.votesFor + exitRequest.votesAgainst;

        // Check if majority vote is reached (>50%)
        const majorityThreshold = Math.floor(eligibleVoters / 2) + 1;

        if (exitRequest.votesFor >= majorityThreshold) {
            // Approve exit request
            exitRequest.status = ExitRequestStatus.APPROVED;

            // Update member status to EXITED
            const exitingMember = await this.circleMemberRepository.findOne({
                where: {
                    circleId: circleId,
                    userId: exitRequest.userId,
                },
            });

            if (exitingMember) {
                exitingMember.status = CircleMemberStatus.EXITED;
                await this.circleMemberRepository.save(exitingMember);
            }
        } else if (exitRequest.votesAgainst >= majorityThreshold) {
            // Reject exit request
            exitRequest.status = ExitRequestStatus.REJECTED;
        }

        await this.exitRequestRepository.save(exitRequest);

        return {
            id: exitRequest.id,
            status: exitRequest.status,
            votesFor: exitRequest.votesFor,
            votesAgainst: exitRequest.votesAgainst,
            totalVotes,
            eligibleVoters,
            majorityThreshold,
        };
    }

    async markPayoutComplete(payoutScheduleId: string) {
        const payoutSchedule = await this.payoutScheduleRepository.findOne({
            where: { id: payoutScheduleId },
            relations: ["cycle", "cycle.circle"],
        });

        if (!payoutSchedule) {
            throw new NotFoundException("Payout schedule not found");
        }

        // Update payout status to COMPLETED
        payoutSchedule.status = "COMPLETED";
        await this.payoutScheduleRepository.save(payoutSchedule);

        // Check if all payouts in this cycle are completed
        await this.checkAndCompleteCircle(payoutSchedule.cycle.circle.id);

        return payoutSchedule;
    }

    private async checkAndCompleteCircle(circleId: string) {
        const circle = await this.circleRepository.findOne({
            where: { id: circleId },
        });

        if (!circle || !circle.currentCycleId) {
            return;
        }

        // Get all payout schedules for the current cycle
        const payoutSchedules = await this.payoutScheduleRepository.find({
            where: { cycleId: circle.currentCycleId },
        });

        // Check if all payouts are completed
        const allCompleted = payoutSchedules.every(
            (schedule) => schedule.status === "COMPLETED"
        );

        if (allCompleted && payoutSchedules.length > 0) {
            // Mark circle as COMPLETED
            circle.status = CircleStatus.COMPLETED;
            await this.circleRepository.save(circle);
        }
    }

    private shuffleArray<T>(array: T[]): T[] {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    private generateInviteCode(): string {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let result = "";
        const bytes = crypto.randomBytes(10);
        for (let i = 0; i < 10; i++) {
            result += chars.charAt(bytes[i] % chars.length);
        }
        return result;
    }
}
