import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    OneToMany,
} from "typeorm";
import { CircleMember } from "./circle-member.entity";
import { Cycle } from "./cycle.entity";
import { ExitRequest } from "./exit-request.entity";

export enum CircleFrequency {
    WEEKLY = "WEEKLY",
    MONTHLY = "MONTHLY",
    QUARTERLY = "QUARTERLY",
}

export enum CircleStatus {
    FORMING = "FORMING",
    ACTIVE = "ACTIVE",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED",
}

@Entity("circles")
export class Circle {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    name: string;

    @Column({ type: "text", nullable: true })
    description: string;

    @Column("decimal", { precision: 10, scale: 2 })
    contributionAmount: number;

    @Column({
        type: "enum",
        enum: CircleFrequency,
    })
    frequency: CircleFrequency;

    @Column("int")
    maxMembers: number;

    @Column({ default: false })
    isPublic: boolean;

    @Column({ unique: true })
    inviteCode: string;

    @Column({
        type: "enum",
        enum: CircleStatus,
        default: CircleStatus.FORMING,
    })
    status: CircleStatus;

    @Column({ nullable: true })
    currentCycleId: string;

    @OneToMany(() => CircleMember, (circleMember) => circleMember.circle)
    members: CircleMember[];

    @OneToMany(() => Cycle, (cycle) => cycle.circle)
    cycles: Cycle[];

    @OneToMany(() => ExitRequest, (exitRequest) => exitRequest.circle)
    exitRequests: ExitRequest[];

    @CreateDateColumn({ type: "timestamptz" })
    createdAt: Date;
}
