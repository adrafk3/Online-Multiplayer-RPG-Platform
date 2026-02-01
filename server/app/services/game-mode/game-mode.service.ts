import { EndGameService } from '@app/services/end-game/end-game.service';
import { GameRoomService } from '@app/services/game-room/game-room.service';
import { TurnService } from '@app/services/turns/turn-service';
import { FlagTakenPayload, Player, RoomData } from '@common/interfaces';
import { Position } from '@common/types';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GameModeService {
    constructor(
        private gameRoomService: GameRoomService,
        private endService: EndGameService,
        private turnService: TurnService,
    ) {}

    flagTaken(payload: FlagTakenPayload) {
        const room = this.gameRoomService.rooms.get(payload.roomId);
        if (room) {
            room.flagHolderId = payload.flagHolderId;
            if (!room.globalStats.flagHolders.some((id) => id === payload.flagHolderId)) {
                room.globalStats.flagHolders.push(payload.flagHolderId);
            }
            return room.players.find((player) => player.id === payload.flagHolderId);
        }
    }

    flagDropped(roomId: string): void {
        const room = this.gameRoomService.rooms.get(roomId);
        if (room) {
            room.flagHolderId = undefined;
        }
    }

    checkFlagCaptured(roomId: string, flagHolder: Player) {
        const room = this.gameRoomService.rooms.get(roomId);
        if (room && room.flagHolderId && flagHolder.id === room.flagHolderId) {
            if (flagHolder.position.x === flagHolder.startingPoint.x && flagHolder.position.y === flagHolder.startingPoint.y) {
                return this.flagCaptured(roomId);
            }
        }
    }

    flagCaptured(roomId: string) {
        const room = this.gameRoomService.rooms.get(roomId);
        if (!room) return;
        if (room.teams) {
            for (const team of room.teams) {
                if (team.some((player) => player.id === room.flagHolderId)) {
                    team.forEach((player) => {
                        const roomPlayer = room.players.find((p) => p.id === player.id);
                        if (roomPlayer) {
                            roomPlayer.victories = (roomPlayer.victories || 0) + 1;
                        }
                    });
                    return team;
                }
            }
        }
    }
    isPartOfTeam(self: Player, other: Player, players: Player[][]): boolean {
        if (players) {
            for (const team of players) {
                if (team.some((playerToCheck) => playerToCheck.id === self.id) && team.some((playerToCheck) => playerToCheck.id === other.id)) {
                    return true;
                }
            }
        }
        return false;
    }
    setTilesVisited(room: RoomData, movingPlayer: Player, nextPosition: Position) {
        this.endService.setTilesVisitedPercentage(room, movingPlayer, nextPosition);
    }
    setGlobalStats(room: RoomData) {
        this.endService.setGlobalStats(room);
    }
    nextTurn(roomId: string) {
        return this.turnService.nextTurn(roomId);
    }
}
