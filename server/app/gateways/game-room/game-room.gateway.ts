import { Injectable, Logger } from '@nestjs/common';
import {
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ActiveGameEvents, DebugEvents, GameRoomEvents } from '@common/gateway-events';
import { GameRoomService } from '@app/services/game-room/game-room.service';
import { AvatarUpdate, KickPayload, PlayerDisconnect, SocketPayload, VirtualPlayerPayload } from '@common/interfaces';
import { TurnService } from '@app/services/turns/turn-service';
import { DebugService } from '@app/services/debug/debug-service.service';
import { VirtualPlayerService } from '@app/services/virtual-player/virtual-player-service/virtual-player.service';

@WebSocketGateway({ cors: true })
@Injectable()
export class GameRoomGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
    @WebSocketServer()
    private server: Server;

    constructor(
        private readonly logger: Logger,
        private gameRoomService: GameRoomService,
        private turnService: TurnService,
        private debugService: DebugService,
        private virtualPlayerService: VirtualPlayerService,
    ) {}
    @SubscribeMessage(GameRoomEvents.JoinGame)
    handleJoinGame(client: Socket, payload: SocketPayload): void {
        const room = this.gameRoomService.hasRoom(payload.roomId);
        if (room) {
            client.join(payload.roomId);
            this.broadcastAvatarUpdate(payload.roomId);
        }
    }
    @SubscribeMessage(GameRoomEvents.AvatarUpdate)
    handleAvatarUpdate(client: Socket, payload: AvatarUpdate) {
        if (payload.nextAvatar) {
            this.gameRoomService.updateAvatar(payload, client.id);
        }
        this.broadcastAvatarUpdate(payload.roomId);
    }
    @SubscribeMessage(GameRoomEvents.RoomUpdate)
    handleRoomUpdate(@MessageBody() payload: SocketPayload) {
        this.logger.log(this.gameRoomService.rooms.get(payload.roomId));
        this.broadcastRoomUpdate(payload.roomId);
    }
    @SubscribeMessage(GameRoomEvents.KickPlayer)
    handleKickPlayer(@MessageBody() payload: KickPayload) {
        if (this.gameRoomService.hasRoom(payload.roomId)) {
            const isKicked = this.gameRoomService.kickPlayer(payload.roomId, payload.player);
            if (isKicked) {
                const playerSocket = this.server.sockets.sockets.get(payload.player);
                if (playerSocket) {
                    playerSocket.leave(payload.roomId);
                    playerSocket.emit(GameRoomEvents.KickUpdate, { message: 'Vous avez été retiré de la partie' });
                }
                this.broadcastRoomUpdate(payload.roomId);
                this.broadcastAvatarUpdate(payload.roomId);
                this.logger.log(`Player ${payload.player} kicked from room ${payload.roomId}`);
            }
        }
    }
    @SubscribeMessage(GameRoomEvents.ToggleLock)
    handleToggleLock(@MessageBody() payload: SocketPayload) {
        if (this.gameRoomService.hasRoom(payload.roomId)) {
            const isLocked = this.gameRoomService.toggleLock(payload.roomId);
            this.server.to(payload.roomId).emit(GameRoomEvents.ToggleLock, { isLocked });
        }
    }
    @SubscribeMessage(GameRoomEvents.AddVirtualPlayer)
    handleAddVirtualPlayer(@MessageBody() payload: VirtualPlayerPayload) {
        if (this.gameRoomService.hasRoom(payload.roomId)) {
            this.gameRoomService.addVirtualPlayer(payload.roomId, payload.type);
        }
        this.broadcastRoomUpdate(payload.roomId);
        this.broadcastAvatarUpdate(payload.roomId);
    }

    @SubscribeMessage(GameRoomEvents.StartGame)
    handleStartGame(@MessageBody() payload: SocketPayload) {
        if (this.gameRoomService.hasRoom(payload.roomId)) {
            const room = this.gameRoomService.rooms.get(payload.roomId);

            if (room && room.players.length > 0) {
                room.startTime = new Date();
                room.disconnectedPlayers = [];
                room.globalStats = {
                    duration: 0,
                    totalTurns: 1,
                    tilesVisited: [],
                    tilesVisitedPercentage: 0,
                    doorsUsed: [],
                    doorsUsedPercent: 0,
                    flagHolders: [],
                };
                room.players.forEach((playerToCheck) => {
                    playerToCheck.playerStats = {
                        nCombats: 0,
                        nEvasions: 0,
                        nVictories: 0,
                        nDefeats: 0,
                        hpLost: 0,
                        hpDealt: 0,
                        nItemsCollected: 0,
                        tilesVisited: [],
                        tilesVisitedPercentage: 0,
                    };
                });

                const player = this.turnService.setFirstTurn(payload.roomId, room.players);
                if (player && player.type) {
                    this.virtualPlayerService.turnAction(payload.roomId, player);
                }

                this.server.to(payload.roomId).emit(GameRoomEvents.StartGame);
                this.server.to(payload.roomId).emit(ActiveGameEvents.TurnUpdate, { player });
                this.server.to(payload.roomId).emit(DebugEvents.ToggleDebug, { isDebug: room.isDebug });
            }
        }
    }
    @SubscribeMessage(DebugEvents.ToggleDebug)
    handleToggleDebug(@MessageBody() data: SocketPayload) {
        const room = this.debugService.toggleDebug(data.roomId);
        this.logger.log(`Debug mode set to ${room.isDebug} for room ${data.roomId}`);
        this.server.to(data.roomId).emit(DebugEvents.ToggleDebug, { isDebug: room.isDebug });
    }
    afterInit() {
        this.logger.log('GameRoom WebSocket Gateway initialized');
    }
    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }
    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
        const roomId = this.turnService.findRoomFromClient(client.id);
        const isGameStarted = this.turnService.handlePlayerQuit(roomId, client.id, this.server);
        const player: PlayerDisconnect = this.gameRoomService.removeClientFromRooms(client, !!isGameStarted);
        if (isGameStarted) {
            if (this.debugService.hasHostLeft(roomId)) {
                client.broadcast.to(roomId).emit(DebugEvents.ToggleDebug, { isDebug: false });
            }
            if (typeof isGameStarted !== 'boolean' && isGameStarted?.type) {
                this.virtualPlayerService.turnAction(roomId, isGameStarted);
            }
        } else if (player.roomId) {
            if (player.isHost) {
                client.broadcast.to(player.roomId).emit(GameRoomEvents.KickUpdate, { message: "L'hôte a quitté la partie" });
                this.gameRoomService.removeRoom(player.roomId);
            } else {
                this.broadcastRoomUpdate(player.roomId);
                this.broadcastAvatarUpdate(player.roomId);
            }
        }
    }
    private broadcastRoomUpdate(roomId: string) {
        const room = this.gameRoomService.rooms.get(roomId);
        if (room) {
            this.server.to(roomId).emit(GameRoomEvents.RoomUpdate, {
                players: room.players,
                playerMin: room.playerMin,
                playerMax: room.playerMax,
                isLocked: room.isLocked,
            });
        }
    }
    private broadcastAvatarUpdate(roomId: string) {
        const room = this.gameRoomService.rooms.get(roomId);
        if (room) {
            this.server.to(roomId).emit(GameRoomEvents.AvatarUpdate, {
                selectedAvatars: Array.from(room.selectedAvatars.values()),
            });
        }
    }
}
