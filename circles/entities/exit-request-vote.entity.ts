import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { ExitRequest } from "./exit-request.entity";
import { User } from "../../users/entities/user.entity";

@Entity("exit_request_votes")
export class ExitRequestVote {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @ManyToOne(() => ExitRequest)
    @JoinColumn({ name: "exitRequestId" })
    exitRequest: ExitRequest;

    @Column()
    exitRequestId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: "userId" })
    user: User;

    @Column()
    userId: string;

    @Column("boolean")
    vote: boolean; // true = approve, false = reject

    @CreateDateColumn({ type: "timestamptz" })
    createdAt: Date;
}
