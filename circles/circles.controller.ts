import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiBody, ApiOperation } from "@nestjs/swagger";
import { CirclesService } from "./circles.service";
import { CreateCircleDto } from "./dto/create-circle.dto";
import { JoinCircleDto } from "./dto/join-circle.dto";
import { CreateExitRequestDto } from "./dto/create-exit-request.dto";
import { VoteExitRequestDto } from "./dto/vote-exit-request.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { GetUser } from "../auth/decorators/get-user.decorator";

@ApiTags("Circles")
@Controller("circles")
export class CirclesController {
    constructor(private readonly circlesService: CirclesService) {}

    @ApiOperation({ summary: "Create a new savings circle" })
    @ApiBody({ type: CreateCircleDto })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post()
    create(@Body() createCircleDto: CreateCircleDto, @GetUser() user: any) {
        return this.circlesService.create(createCircleDto, user);
    }

    @ApiOperation({ summary: "Join a circle using invite code" })
    @ApiBody({ type: JoinCircleDto })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post("join")
    join(@Body() joinCircleDto: JoinCircleDto, @GetUser() user: any) {
        return this.circlesService.join(joinCircleDto, user);
    }

    @ApiOperation({ summary: "Get all circles for the authenticated user" })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get("my-circles")
    findAll(@GetUser() user: any) {
        return this.circlesService.findAll(user);
    }

    @ApiOperation({
        summary: "Preview circle details via invite code (public)",
    })
    @Get("invite/:code")
    getCircleByInviteCode(@Param("code") code: string) {
        return this.circlesService.getCircleByInviteCode(code);
    }

    @ApiOperation({ summary: "Get full details of a specific circle" })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get(":id")
    findOne(@Param("id") id: string) {
        return this.circlesService.findOne(id);
    }

    @ApiOperation({ summary: "Get all members of a circle" })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get(":id/members")
    getMembers(@Param("id") id: string, @GetUser() user: any) {
        return this.circlesService.getCircleMembers(id, user);
    }

    @ApiOperation({ summary: "Get payout timeline for a circle" })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get(":id/timeline")
    getTimeline(@Param("id") id: string, @GetUser() user: any) {
        return this.circlesService.getCircleTimeline(id, user);
    }

    @ApiOperation({
        summary: "Start the lottery and activate the circle cycle",
    })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post(":id/start")
    startCycle(@Param("id") id: string, @GetUser() user: any) {
        return this.circlesService.startCycle(id, user);
    }

    @ApiOperation({ summary: "Submit a request to exit the circle" })
    @ApiBody({ type: CreateExitRequestDto })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post(":id/exit-request")
    createExitRequest(
        @Param("id") id: string,
        @Body() createExitRequestDto: CreateExitRequestDto,
        @GetUser() user: any
    ) {
        return this.circlesService.createExitRequest(
            id,
            createExitRequestDto,
            user
        );
    }

    @ApiOperation({ summary: "Vote on an exit request" })
    @ApiBody({ type: VoteExitRequestDto })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post(":id/vote")
    voteOnExitRequest(
        @Param("id") id: string,
        @Body() voteExitRequestDto: VoteExitRequestDto,
        @GetUser() user: any
    ) {
        return this.circlesService.voteOnExitRequest(
            id,
            voteExitRequestDto,
            user
        );
    }
}
