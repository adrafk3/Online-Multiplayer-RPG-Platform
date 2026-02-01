import { CombatService } from '@app/services/combat-logic/combat-logic.service';
import { GameLogicService } from '@app/services/game-logic/game-logic-service.service';
import { GameModeService } from '@app/services/game-mode/game-mode.service';
import { GameRoomService } from '@app/services/game-room/game-room.service';
import { CombatResults } from '@common/enums';
import { ActiveGameEvents } from '@common/gateway-events';
import { BoardCell, CombatAction, Grid, MovePlayer, PlayerAction, SocketPayload, ToggleDoor } from '@common/interfaces';
import { Injectable, Logger } from '@nestjs/common';
import { MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true })
@Injectable()
export class GameLogicGateway {
    @WebSocketServer()
    private _server: Server;

    constructor(
        private gameRoomService: GameRoomService,
        private combatService: CombatService,
        private gameModeService: GameModeService,
        private gameLogic: GameLogicService,
    ) {}

    get server() {
        return this._server;
    }

    @SubscribeMessage(ActiveGameEvents.CombatStarted)
    handlePlayerAction(@MessageBody() data: PlayerAction) {
        try {
            const result = this.combatService.handleStartCombat(data.playerId, data.roomId, data.target);
            this._server.to(data.roomId).emit(ActiveGameEvents.CombatInitiated, result);
        } catch (error) {
            Logger.log(error);
        }
    }

    @SubscribeMessage(ActiveGameEvents.CombatAction)
    async handleCombatAction(@MessageBody() data: CombatAction) {
        try {
            const result = this.combatService.processCombatAction(data.action, data.roomId);
            this._server.to(data.roomId).emit(ActiveGameEvents.CombatUpdate, result);
            if (result && 'gameState' in result) {
                const room = this.gameRoomService.rooms.get(data.roomId);
                if (!result.gameState?.isEscape && !result.gameState.combat) {
                    const player = result.gameState.players[1];
                    const nextPosition = this.gameLogic.setNextPosition(player, data, room);
                    this._server.to(data.roomId).emit(ActiveGameEvents.PlayerNextPosition, { player, nextPosition });
                    if (room) {
                        await this.gameLogic.handleCombat(player, data, nextPosition, room, result);
                    }
                }
                if (result.message === CombatResults.EscapeSucceeded && room.currentTurn && room.currentTurn.type) {
                    this.handleEndTurn({ roomId: data.roomId });
                }
            }
        } catch (error) {
            Logger.log(error);
        }
    }

    @SubscribeMessage(ActiveGameEvents.ToggledDoor)
    handleDoorToggle(@MessageBody() data: ToggleDoor) {
        try {
            const room = this.gameRoomService.rooms.get(data.roomId);

            if (!room.globalStats.doorsUsed.some((tile) => tile.x === data.position.x && tile.y === data.position.y)) {
                room.globalStats.doorsUsed.push(data.position);
            }

            data.player = this.gameRoomService.rooms.get(data.roomId).currentTurn;
            this._server.to(data.roomId).emit(ActiveGameEvents.DoorUpdate, data);
        } catch (error) {
            Logger.log(error);
        }
    }

    @SubscribeMessage(ActiveGameEvents.MovePlayer)
    async handleMovePlayer(@MessageBody() data: MovePlayer) {
        try {
            const movingPlayer = data.player;
            let playerInRoom;
            let nextPosition;

            this._server.to(data.roomId).emit(ActiveGameEvents.PlayerStartedMoving);

            for (let i = 0; i < data.path.positions.length; i++) {
                const room = this.gameRoomService.rooms.get(data.roomId);
                if (!room) return;
                playerInRoom = room.players.find((player) => player.id === movingPlayer.id);
                nextPosition = data.path.positions[i];
                if (await this.gameLogic.moveAction({ room, movingPlayer, data, index: i, playerInRoom, nextPosition })) {
                    break;
                }
            }

            if (playerInRoom) {
                playerInRoom.position = nextPosition;
            }
            this._server.to(data.roomId).emit(ActiveGameEvents.MapRequest);
            this._server.to(data.roomId).emit(ActiveGameEvents.PlayerStoppedMoving);
        } catch (error) {
            Logger.log(error);
        }
    }

    @SubscribeMessage(ActiveGameEvents.NextTurn)
    handleEndTurn(@MessageBody() data: SocketPayload) {
        try {
            const room = this.gameRoomService.rooms.get(data.roomId);
            if (!room) return;

            const currentPlayer = this.gameModeService.nextTurn(data.roomId);
            if (!currentPlayer) {
                this.gameRoomService.removeRoom(data.roomId);
                return;
            }
            if (currentPlayer.type) {
                this._server.to(data.roomId).emit(ActiveGameEvents.MapRequest);
                this.gameLogic.turnAction(data.roomId, currentPlayer);
            }
            room.globalStats.totalTurns++;
            this._server.to(data.roomId).emit(ActiveGameEvents.TurnUpdate, { player: currentPlayer });
        } catch (error) {
            Logger.log(error);
        }
    }

    @SubscribeMessage(ActiveGameEvents.FetchStats)
    handleEndGame(@MessageBody() data: { roomId: string; grid: Grid }) {
        try {
            const room = this.gameRoomService.rooms.get(data.roomId);
            if (!room) return;

            const players = room.players;
            const allPlayers = room.disconnectedPlayers?.length > 0 ? [...players, ...room.disconnectedPlayers] : [...players];

            this.gameModeService.setGlobalStats(room);
            this._server.to(data.roomId).emit(ActiveGameEvents.GameEnded, {
                players: allPlayers,
                globalStats: room.globalStats,
            });
        } catch (error) {
            Logger.log(error);
        }
    }

    @SubscribeMessage(ActiveGameEvents.MapRequest)
    handleMapRequest(@MessageBody() data: { roomId: string; map: BoardCell[][] }) {
        try {
            this.gameRoomService.rooms.get(data.roomId).map.board = data.map;
        } catch (error) {
            Logger.log(error);
        }
    }
}
