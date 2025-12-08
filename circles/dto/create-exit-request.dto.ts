import { IsString, IsOptional, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateExitRequestDto {
    @ApiProperty({
        example: "Emergency financial situation requiring immediate withdrawal",
        description: "Reason for requesting to exit the circle (optional)",
        required: false,
        maxLength: 500,
    })
    @IsString()
    @IsOptional()
    @MaxLength(500, { message: "Reason must not exceed 500 characters" })
    reason?: string;
}
