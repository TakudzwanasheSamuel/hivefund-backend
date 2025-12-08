import {
    IsString,
    IsNotEmpty,
    IsNumber,
    IsEnum,
    Min,
    Max,
    MinLength,
    IsOptional,
    IsBoolean,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { CircleFrequency } from "../entities/circle.entity";

export class CreateCircleDto {
    @ApiProperty({
        example: "MSU Hustlers",
        description: "Name of the savings circle",
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(3, { message: "Circle name must be at least 3 characters" })
    name: string;

    @ApiProperty({
        example: "A weekly savings group for friends.",
        description: "A short description of the circle",
        required: false,
    })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({
        example: 20,
        description: "Contribution amount per cycle",
        minimum: 1,
    })
    @IsNumber()
    @Min(1, { message: "Contribution amount must be at least 1" })
    contributionAmount: number;

    @ApiProperty({
        example: CircleFrequency.MONTHLY,
        enum: CircleFrequency,
        description: "Frequency of contributions",
    })
    @Transform(({ value }) =>
        typeof value === "string" ? value.toUpperCase() : value
    )
    @IsEnum(CircleFrequency)
    frequency: CircleFrequency;

    @ApiProperty({
        example: 10,
        description: "Maximum number of members",
        minimum: 4,
        maximum: 10,
    })
    @IsNumber()
    @Min(4, { message: "Circle must have at least 4 members" })
    @Max(10, { message: "Circle cannot have more than 10 members" })
    maxMembers: number;

    @ApiProperty({
        example: false,
        description: "Whether the circle is public and discoverable",
        default: false,
        required: false,
    })
    @IsBoolean()
    @IsOptional()
    isPublic?: boolean;
}
