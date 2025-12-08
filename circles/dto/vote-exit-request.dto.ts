import { IsUUID, IsBoolean, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class VoteExitRequestDto {
    @ApiProperty({
        example: "550e8400-e29b-41d4-a716-446655440000",
        description: "ID of the exit request to vote on",
    })
    @IsUUID()
    @IsNotEmpty()
    exitRequestId: string;

    @ApiProperty({
        example: true,
        description: "Vote decision (true = approve, false = reject)",
    })
    @IsBoolean()
    @IsNotEmpty()
    approve: boolean;
}
