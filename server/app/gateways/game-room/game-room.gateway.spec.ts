import { DebugService } from '@app/services/debug/debug-service.service';
import { GameRoomService } from '@app/services/game-room/game-room.service';
import { TimerService } from '@app/services/time/time.service';
import { TurnService } from '@app/services/turns/turn-service';
import { VirtualPlayerService } from '@app/services/virtual-player/virtual-player-service/virtual-player.service';
import { VirtualPlayerTypes } from '@common/enums';
import { ActiveGameEvents, DebugEvents, GameRoomEvents } from '@common/gateway-events';
import { Player, RoomData } from '@common/interfaces';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';
import { GameRoomGateway } from './game-room.gateway';
import { MOCK_PLAYERS } from '@common/constants.spec';

describe('GameRoomGateway', () => {
    let gateway: GameRoomGateway;
    let gameRoomService: jest.Mocked<GameRoomService>;
    let mockLogger: jest.Mocked<Logger>;
    let mockServer: jest.Mocked<Server>;
    let client: jest.Mocked<Socket>;
    let broadcastAvatarUpdate: jest.SpyInstance;
    let broadcastRoomUpdate: jest.SpyInstance;
    let mockDebug: jest.Mocked<DebugService>;
    let mockVirtualPlayers: jest.Mocked<VirtualPlayerService>;
    let mockTurnService: jest.Mocked<TurnService>;

    beforeEach(async () => {
        gameRoomService = {
            hasRoom: jest.fn(),
            rooms: new Map(),
            kickPlayer: jest.fn(),
            toggleLock: jest.fn(),
            addVirtualPlayer: jest.fn(),
            removeClientFromRooms: jest.fn(),
            removeRoom: jest.fn(),
            updateAvatar: jest.fn(),
        } as unknown as jest.Mocked<GameRoomService>;

        mockLogger = {
            log: jest.fn(),
        } as unknown as jest.Mocked<Logger>;

        mockVirtualPlayers = {
            turnAction: jest.fn(),
        } as unknown as jest.Mocked<VirtualPlayerService>;

        mockDebug = {
            toggleDebug: jest.fn(),
            hasHostLeft: jest.fn(),
        } as unknown as jest.Mocked<DebugService>;

        mockServer = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
            sockets: {
                sockets: new Map(),
            },
        } as unknown as jest.Mocked<Server>;

        mockTurnService = {
            setFirstTurn: jest.fn(),
            findRoomFromClient: jest.fn(),
            handlePlayerQuit: jest.fn(),
        } as unknown as jest.Mocked<TurnService>;

        mockVirtualPlayers = {
            turnAction: jest.fn(),
        } as unknown as jest.Mocked<VirtualPlayerService>;

        client = {
            join: jest.fn(),
            leave: jest.fn(),
            emit: jest.fn(),
            broadcast: {
                to: jest.fn().mockReturnThis(),
            },
            id: 'client1',
        } as unknown as jest.Mocked<Socket>;
        (client.broadcast.to as jest.Mock).mockReturnValue({
            emit: jest.fn(),
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GameRoomGateway,
                { provide: GameRoomService, useValue: gameRoomService },
                { provide: Logger, useValue: mockLogger },
                { provide: TurnService, useValue: mockTurnService },
                { provide: TimerService, useClass: TimerService },
                { provide: DebugService, useValue: mockDebug },
                { provide: VirtualPlayerService, useValue: mockVirtualPlayers },
            ],
        }).compile();

        gateway = module.get<GameRoomGateway>(GameRoomGateway);
        gateway['server'] = mockServer;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        broadcastAvatarUpdate = jest.spyOn(gateway as any, 'broadcastAvatarUpdate');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        broadcastRoomUpdate = jest.spyOn(gateway as any, 'broadcastRoomUpdate');
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    describe('events', () => {
        const roomId = 'room1';
        const payload = { roomId, player: 'player1', type: VirtualPlayerTypes.Aggressive };
        const room = {
            players: [],
            selectedAvatars: new Map(),
            playerMin: 1,
            playerMax: 4,
            isLocked: false,
            isDebug: false,
        };
        it('should handle join game', () => {
            gameRoomService.hasRoom.mockReturnValue(true);

            gateway.handleJoinGame(client, payload);

            expect(client.join).toHaveBeenCalledWith(payload.roomId);
        });

        it('should handle avatar update', () => {
            gateway.handleAvatarUpdate(client, payload);

            expect(broadcastAvatarUpdate).toHaveBeenCalledWith(payload.roomId);
        });

        it('should handle avatar update with nextAvatar', () => {
            const avatarPayload = {
                roomId: 'room1',
                nextAvatar: 'newAvatar',
                player: 'player1',
            };

            gateway.handleAvatarUpdate(client, avatarPayload);

            expect(gameRoomService.updateAvatar).toHaveBeenCalledWith(avatarPayload, client.id);
            expect(broadcastAvatarUpdate).toHaveBeenCalledWith(avatarPayload.roomId);
        });

        it('should handle room update', () => {
            gameRoomService.rooms.set(payload.roomId, room);

            gateway.handleRoomUpdate(payload);

            expect(mockLogger.log).toHaveBeenCalled();
            expect(broadcastRoomUpdate).toHaveBeenCalledWith(payload.roomId);
        });

        it('should handle kick player', () => {
            gameRoomService.hasRoom.mockReturnValue(true);
            gameRoomService.kickPlayer.mockReturnValue(true);
            mockServer.sockets.sockets.set(payload.player, client);

            gateway.handleKickPlayer(payload);

            expect(client.leave).toHaveBeenCalledWith(payload.roomId);
            expect(client.emit).toHaveBeenCalledWith(GameRoomEvents.KickUpdate, { message: 'Vous avez été retiré de la partie' });
            expect(broadcastRoomUpdate).toHaveBeenCalledWith(payload.roomId);
            expect(broadcastAvatarUpdate).toHaveBeenCalledWith(payload.roomId);
            expect(mockLogger.log).toHaveBeenCalledWith(`Player ${payload.player} kicked from room ${payload.roomId}`);
        });

        it('should handle toggle lock', () => {
            gameRoomService.hasRoom.mockReturnValue(true);
            gameRoomService.toggleLock.mockReturnValue(true);

            gateway.handleToggleLock(payload);

            expect(mockServer.to).toHaveBeenCalledWith(payload.roomId);
        });

        it('should handle add virtual player', () => {
            gameRoomService.hasRoom.mockReturnValue(true);

            gateway.handleAddVirtualPlayer(payload);

            expect(gameRoomService.addVirtualPlayer).toHaveBeenCalledWith(payload.roomId, payload.type);
            expect(broadcastRoomUpdate).toHaveBeenCalledWith(payload.roomId);
            expect(broadcastAvatarUpdate).toHaveBeenCalledWith(payload.roomId);
        });

        describe('handleStartGame', () => {
            it('should start the game and emit the correct events', () => {
                const mockPlayer = {
                    type: VirtualPlayerTypes.Aggressive,
                    playerStats: {},
                } as unknown as Player;

                const mockRoom = {
                    players: [mockPlayer],
                    isDebug: true,
                    disconnectedPlayers: ['someone'],
                } as unknown as RoomData;

                const mockFirstTurnPlayer = {
                    ...mockPlayer,
                    type: VirtualPlayerTypes.Aggressive,
                };

                gameRoomService.hasRoom.mockReturnValue(true);
                gameRoomService.rooms.set(payload.roomId, mockRoom);
                mockTurnService.setFirstTurn.mockReturnValue(mockFirstTurnPlayer);

                gateway.handleStartGame(payload);
                // eslint-disable-next-line @typescript-eslint/no-shadow
                const room = gameRoomService.rooms.get(payload.roomId);

                expect(mockTurnService.setFirstTurn).toHaveBeenCalledWith(payload.roomId, room.players);
                expect(mockVirtualPlayers.turnAction).toHaveBeenCalledWith(payload.roomId, mockFirstTurnPlayer);
                expect(mockServer.to(payload.roomId).emit).toHaveBeenCalledWith(GameRoomEvents.StartGame);
                expect(mockServer.to(payload.roomId).emit).toHaveBeenCalledWith(ActiveGameEvents.TurnUpdate, { player: mockFirstTurnPlayer });
                expect(mockServer.to(payload.roomId).emit).toHaveBeenCalledWith(DebugEvents.ToggleDebug, { isDebug: room.isDebug });
            });

            it('should not start the game if the room does not exist', () => {
                gameRoomService.hasRoom.mockReturnValue(false);

                gateway.handleStartGame(payload);

                expect(mockServer.to).not.toHaveBeenCalled();
            });

            it('should not start the game if room has no players', () => {
                gameRoomService.hasRoom.mockReturnValue(true);
                gameRoomService.rooms.set(payload.roomId, { players: [] } as unknown as RoomData);

                gateway.handleStartGame(payload);

                expect(mockServer.to).not.toHaveBeenCalled();
            });
        });

        it('should handle toggle debug', () => {
            gameRoomService.rooms.set(payload.roomId, room);
            mockDebug.toggleDebug.mockReturnValue(room);

            gateway.handleToggleDebug(payload);
            expect(mockDebug.toggleDebug).toHaveBeenCalledWith(payload.roomId);
            expect(mockServer.to).toHaveBeenCalledWith(payload.roomId);
            expect(mockServer.to(payload.roomId).emit).toHaveBeenCalledWith(DebugEvents.ToggleDebug, { isDebug: room.isDebug });
        });

        it('should handle host leaving the room', () => {
            const player = MOCK_PLAYERS[0];
            player.type = VirtualPlayerTypes.Defensive;
            gameRoomService.rooms.set(roomId, room);
            mockTurnService.findRoomFromClient.mockReturnValue(roomId);
            mockTurnService.handlePlayerQuit.mockReturnValue(player);
            mockDebug.hasHostLeft.mockReturnValue(true);

            gateway.handleDisconnect(client);

            expect(mockDebug.hasHostLeft).toHaveBeenCalledWith(roomId);
            expect(client.broadcast.to).toHaveBeenCalledWith(roomId);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const emitMock = (client.broadcast.to(roomId) as any).emit;
            expect(emitMock).toHaveBeenCalledWith(DebugEvents.ToggleDebug, { isDebug: false });
        });

        it('should log after init', () => {
            gateway.afterInit();
            expect(mockLogger.log).toHaveBeenCalledWith('GameRoom WebSocket Gateway initialized');
        });

        it('should log client connection', () => {
            gateway.handleConnection(client);
            expect(mockLogger.log).toHaveBeenCalledWith(`Client connected: ${client.id}`);
        });

        it('should handle client disconnect', () => {
            gameRoomService.removeClientFromRooms.mockReturnValue({ isHost: true, roomId: 'room1' });

            gateway.handleDisconnect(client);

            expect(mockLogger.log).toHaveBeenCalledWith(`Client disconnected: ${client.id}`);
            expect(client.broadcast.to).toHaveBeenCalledWith('room1');
            expect(gameRoomService.removeRoom).toHaveBeenCalledWith('room1');
        });

        it('should broadcast avatar update', () => {
            gameRoomService.rooms.set(roomId, room);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (gateway as any).broadcastAvatarUpdate(roomId);
            expect(mockServer.to).toHaveBeenCalledWith(roomId);
            expect(mockServer.to(roomId).emit).toHaveBeenCalledWith(GameRoomEvents.AvatarUpdate, {
                selectedAvatars: [],
            });
        });

        it('should handle client disconnect for non-host', () => {
            gameRoomService.removeClientFromRooms.mockReturnValue({ isHost: false, roomId });

            gateway.handleDisconnect(client);

            expect(mockLogger.log).toHaveBeenCalledWith(`Client disconnected: ${client.id}`);
            expect(broadcastRoomUpdate).toHaveBeenCalledWith(roomId);
            expect(broadcastAvatarUpdate).toHaveBeenCalledWith(roomId);
        });

        it('should update avatar when nextAvatar is provided', () => {
            const updatePayload = {
                roomId: 'room1',
                player: 'player1',
                nextAvatar: 'new-avatar',
            };

            gameRoomService.updateAvatar = jest.fn();

            gateway.handleAvatarUpdate(client, updatePayload);

            expect(gameRoomService.updateAvatar).toHaveBeenCalledWith(updatePayload, client.id);
            expect(broadcastAvatarUpdate).toHaveBeenCalledWith(updatePayload.roomId);
        });
    });
});
