import { Controller, Post, Body, Get, Param, HttpCode, HttpStatus, HttpException, Logger } from '@nestjs/common';
import { GameRoomService } from '@app/services/game-room/game-room.service';
import { CreateGameResponse, SelectAvatarPayload } from '@common/interfaces';

@Controller('game-room')
export class GameRoomController {
    constructor(
        private readonly gameRoomService: GameRoomService,
        private logger: Logger,
    ) {}

    @Post('create')
    @HttpCode(HttpStatus.CREATED)
    async createRoom(@Body('gameId') gameId: string): Promise<CreateGameResponse> {
        try {
            const roomId = await this.gameRoomService.createGameRoom(gameId);
            this.logger.log(`New room created: ${roomId} for game ${gameId}`);
            return { roomId };
        } catch (error) {
            this.logger.error(`Failed to create room for game ${gameId}`, error.stack);
            throw new HttpException('Failed to create room', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    @Get('validate/:roomId')
    @HttpCode(HttpStatus.OK)
    validateCode(@Param('roomId') roomId: string) {
        if (this.gameRoomService.hasRoom(roomId)) {
            if (this.gameRoomService.isLocked(roomId)) {
                throw new HttpException({ message: "La partie n'existe pas" }, HttpStatus.FORBIDDEN);
            }
            return;
        } else {
            throw new HttpException({ message: "La partie n'existe pas" }, HttpStatus.NOT_FOUND);
        }
    }
    @Post('selectAvatar')
    @HttpCode(HttpStatus.CREATED)
    selectAvatar(@Body() payload: SelectAvatarPayload) {
        const player = this.gameRoomService.selectAvatar(payload.roomId, payload.player);
        if (player) {
            return {
                player,
            };
        } else {
            throw new HttpException("L'avatar est déjà pris!", HttpStatus.BAD_REQUEST);
        }
    }

    @Get(':roomId/players')
    @HttpCode(HttpStatus.OK)
    getPlayers(@Param('roomId') roomId: string) {
        try {
            return this.gameRoomService.getPlayers(roomId);
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.NOT_FOUND);
        }
    }
}
