import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { Circle } from "./circle.entity";
import { User } from "../../users/entities/user.entity";

export enum ExitRequestStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
}

@Entity("exit_requests")
export class ExitRequest {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: "userId" })
    user: User;

    @Column()
    userId: string;

    @Column({ nullable: true })
    reason: string;

    @Column("int", { default: 0 })
    votesFor: number;

    @Column("int", { default: 0 })
    votesAgainst: number;

    @Column({
        type: "enum",
        enum: ExitRequestStatus,
        default: ExitRequestStatus.PENDING,
    })
    status: ExitRequestStatus;

    @ManyToOne(() => Circle)
    @JoinColumn({ name: "circleId" })
    circle: Circle;

    @Column()
    circleId: string;

    @CreateDateColumn({ type: "timestamptz" })
    createdAt: Date;

    @UpdateDateColumn({ type: "timestamptz" })
    updatedAt: Date;
}
