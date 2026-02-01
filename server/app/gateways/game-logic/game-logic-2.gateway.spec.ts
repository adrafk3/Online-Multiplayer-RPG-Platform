import { Test, TestingModule } from '@nestjs/testing';
import { GameLogicGateway } from './game-logic.gateway';
import { GameRoomService } from '@app/services/game-room/game-room.service';
import { CombatService } from '@app/services/combat-logic/combat-logic.service';
import { GameModeService } from '@app/services/game-mode/game-mode.service';
import { GameLogicService } from '@app/services/game-logic/game-logic-service.service';
import { Server } from 'socket.io';
import { VirtualPlayerTypes } from '@common/enums';
import { MovePlayer, Player, SocketPayload, ToggleDoor, Grid, Path, RoomData } from '@common/interfaces';
import { ActiveGameEvents } from '@common/gateway-events';
import { GAME_DATA, MOCK_PLAYERS } from '@common/constants.spec';
import { Logger } from '@nestjs/common';

describe('GameLogicGateway', () => {
    let gateway: GameLogicGateway;
    let mockGameRoomService: jest.Mocked<GameRoomService>;
    let mockCombatService: jest.Mocked<CombatService>;
    let mockGameModeService: jest.Mocked<GameModeService>;
    let mockGameLogicService: jest.Mocked<GameLogicService>;
    let mockServer: jest.Mocked<Server>;

    const mockPlayer: Player = MOCK_PLAYERS[0];

    const mockTargetPlayer: Player = MOCK_PLAYERS[1];

    const mockPath: Path = {
        positions: [
            { x: 1, y: 0 },
            { x: 2, y: 0 },
        ],
        cost: 10,
        turns: 1,
    };

    const mockGrid: Grid = { ...GAME_DATA } as Grid;

    beforeEach(async () => {
        mockGameRoomService = {
            rooms: new Map(),
            removeRoom: jest.fn(),
        } as unknown as jest.Mocked<GameRoomService>;

        mockCombatService = {
            handleStartCombat: jest.fn(),
            processCombatAction: jest.fn(),
        } as unknown as jest.Mocked<CombatService>;

        mockGameModeService = {
            nextTurn: jest.fn(),
            setGlobalStats: jest.fn(),
        } as unknown as jest.Mocked<GameModeService>;

        mockGameLogicService = {
            setNextPosition: jest.fn(),
            handleCombat: jest.fn(),
            turnAction: jest.fn(),
            moveAction: jest.fn(),
        } as unknown as jest.Mocked<GameLogicService>;

        mockServer = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        } as unknown as jest.Mocked<Server>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GameLogicGateway,
                { provide: GameRoomService, useValue: mockGameRoomService },
                { provide: CombatService, useValue: mockCombatService },
                { provide: GameModeService, useValue: mockGameModeService },
                { provide: GameLogicService, useValue: mockGameLogicService },
            ],
        }).compile();

        jest.spyOn(Logger, 'log');
        gateway = module.get<GameLogicGateway>(GameLogicGateway);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gateway as any)._server = mockServer;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('handleDoorToggle', () => {
        const mockData: ToggleDoor = {
            position: { x: 1, y: 1 },
            roomId: 'room1',
            isOpened: true,
            player: mockPlayer,
        };
        it('should update door state and emit DoorUpdate', () => {
            mockGameRoomService.rooms.set('room1', {
                currentTurn: mockPlayer,
                globalStats: { doorsUsed: [] },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);

            gateway.handleDoorToggle(mockData);

            expect(mockServer.to).toHaveBeenCalledWith('room1');
            expect(mockServer.emit).toHaveBeenCalledWith(
                ActiveGameEvents.DoorUpdate,
                expect.objectContaining({
                    position: { x: 1, y: 1 },
                    player: mockPlayer,
                }),
            );
        });

        it('it should log an error if handleDoorTile provokes an error', async () => {
            const error = new Error('Async combat error');
            jest.spyOn(mockGameRoomService.rooms, 'get').mockImplementation(() => {
                throw error;
            });
            await gateway.handleDoorToggle(mockData);
            expect(Logger.log).toHaveBeenCalledWith(error);
        });

        it("should not push door used if door wasn't used", async () => {
            mockGameRoomService.rooms.set('room1', {
                currentTurn: { type: 'human' },
                players: [mockPlayer, mockTargetPlayer],
                globalStats: {
                    doorsUsed: [{ x: 1, y: 1 }],
                },
            } as unknown as RoomData);

            await gateway.handleDoorToggle(mockData);

            expect(mockServer.to).toHaveBeenCalledWith('room1');
        });
    });

    describe('handleMovePlayer', () => {
        const mockData: MovePlayer = {
            player: mockPlayer,
            roomId: 'room1',
            path: mockPath,
            grid: mockGrid,
        };
        it('should move player through path and emit updates', async () => {
            mockGameRoomService.rooms.set('room1', {
                players: [mockPlayer],
            } as unknown as RoomData);
            mockGameLogicService.moveAction.mockResolvedValue(false);

            await gateway.handleMovePlayer(mockData);

            expect(mockServer.emit).toHaveBeenCalledWith(ActiveGameEvents.PlayerStartedMoving);
            expect(mockGameLogicService.moveAction).toHaveBeenCalledTimes(2);
            expect(mockServer.emit).toHaveBeenCalledWith(ActiveGameEvents.MapRequest);
            expect(mockServer.emit).toHaveBeenCalledWith(ActiveGameEvents.PlayerStoppedMoving);
        });

        it('should return early if room does not exist', async () => {
            mockGameRoomService.rooms.get = jest.fn().mockReturnValue(undefined);

            await gateway.handleMovePlayer(mockData);

            expect(mockGameLogicService.moveAction).not.toHaveBeenCalled();

            expect(mockServer.to).toHaveBeenCalledWith(mockData.roomId);
            expect(mockServer.emit).toHaveBeenCalledWith(ActiveGameEvents.PlayerStartedMoving);
            expect(mockServer.emit).not.toHaveBeenCalledWith(ActiveGameEvents.MapRequest);
            expect(mockServer.emit).not.toHaveBeenCalledWith(ActiveGameEvents.PlayerStoppedMoving);
        });

        it('should log an error if handleMovePlayer provokes an error', async () => {
            const error = new Error('Async combat error');
            jest.spyOn(mockGameRoomService.rooms, 'get').mockImplementation(() => {
                throw error;
            });
            await gateway.handleMovePlayer(mockData);
            expect(Logger.log).toHaveBeenCalledWith(error);
        });

        it('should break the loop when moveAction returns true', async () => {
            const mockMoveAction = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);

            mockGameLogicService.moveAction = mockMoveAction;

            const mockRoom = {
                players: [{ id: 'player1', position: { x: 0, y: 0 } }],
            };

            mockGameRoomService.rooms.get = jest.fn().mockReturnValue(mockRoom);

            await gateway.handleMovePlayer(mockData);

            expect(mockMoveAction).toHaveBeenCalledTimes(2);

            expect(mockServer.to).toHaveBeenCalledWith('room1');
        });
    });

    describe('handleEndTurn', () => {
        const mockData: SocketPayload = { roomId: 'room1' };
        it('should advance to next turn and emit updates', () => {
            const nextPlayer = { ...mockTargetPlayer, type: VirtualPlayerTypes.Aggressive };
            mockGameModeService.nextTurn.mockReturnValue(nextPlayer);
            mockGameRoomService.rooms.set('room1', {
                globalStats: { totalTurns: 0 },
            } as unknown as RoomData);

            gateway.handleEndTurn(mockData);

            expect(mockGameModeService.nextTurn).toHaveBeenCalledWith('room1');
            expect(mockServer.emit).toHaveBeenCalledWith(ActiveGameEvents.TurnUpdate, { player: nextPlayer });
            expect(mockGameLogicService.turnAction).toHaveBeenCalledWith('room1', nextPlayer);
        });

        it('should log an error if handleEndTurn provokes an error', async () => {
            const error = new Error('Async combat error');
            jest.spyOn(mockGameRoomService.rooms, 'get').mockImplementation(() => {
                throw error;
            });
            await gateway.handleEndTurn(mockData);
            expect(Logger.log).toHaveBeenCalledWith(error);
        });

        it('should return early if room is not found', async () => {
            mockGameRoomService.rooms.get = jest.fn().mockReturnValue(undefined);

            await gateway.handleEndTurn(mockData);

            expect(mockServer.emit).not.toHaveBeenCalled();
        });
    });

    describe('handleEndGame', () => {
        const mockData = {
            roomId: 'room1',
            grid: mockGrid,
        };
        it('should emit game ended with stats', () => {
            mockGameRoomService.rooms.set('room1', {
                players: [mockPlayer, mockTargetPlayer],
                disconnectedPlayers: [],
                globalStats: { totalTurns: 10 },
            } as unknown as RoomData);

            gateway.handleEndGame(mockData);

            expect(mockGameModeService.setGlobalStats).toHaveBeenCalled();
            expect(mockServer.emit).toHaveBeenCalledWith(ActiveGameEvents.GameEnded, {
                players: [mockPlayer, mockTargetPlayer],
                globalStats: { totalTurns: 10 },
            });
        });

        it('should log an error if handleEndTurn provokes an error', async () => {
            const error = new Error('Async combat error');
            jest.spyOn(mockGameRoomService.rooms, 'get').mockImplementation(() => {
                throw error;
            });
            await gateway.handleEndGame(mockData);
            expect(Logger.log).toHaveBeenCalledWith(error);
        });

        it('should return early if room is not found', async () => {
            mockGameRoomService.rooms.get = jest.fn().mockReturnValue(undefined);

            await gateway.handleEndGame(mockData);

            expect(mockServer.emit).not.toHaveBeenCalled();
        });

        it('should handle the case where is a disconnected player', () => {
            mockGameRoomService.rooms.set('room1', {
                players: [mockTargetPlayer],
                disconnectedPlayers: [mockPlayer],
                globalStats: { totalTurns: 10 },
            } as unknown as RoomData);

            gateway.handleEndGame(mockData);

            expect(mockServer.emit).toHaveBeenCalledWith(ActiveGameEvents.GameEnded, {
                players: [mockTargetPlayer, mockPlayer],
                globalStats: { totalTurns: 10 },
            });
        });

        it('should handle the case where disconnectedPlayers is undefined', () => {
            mockGameRoomService.rooms.set('room1', {
                players: [mockPlayer, mockTargetPlayer],
                globalStats: { totalTurns: 10 },
            } as unknown as RoomData);

            gateway.handleEndGame(mockData);

            expect(mockServer.emit).toHaveBeenCalledWith(ActiveGameEvents.GameEnded, {
                players: [mockPlayer, mockTargetPlayer],
                globalStats: { totalTurns: 10 },
            });
        });
    });

    describe('handleMapRequest', () => {
        const mockData = {
            roomId: 'room1',
            map: mockGrid.board,
        };
        it('should update room map', () => {
            const mockRoom = { map: { board: [] } };
            mockGameRoomService.rooms.set('room1', mockRoom as unknown as RoomData);

            gateway.handleMapRequest(mockData);

            expect(mockRoom.map.board).toEqual(mockGrid.board);
        });

        it('should log an error if handleEndTurn provokes an error', async () => {
            const error = new Error('Async combat error');
            jest.spyOn(mockGameRoomService.rooms, 'get').mockImplementation(() => {
                throw error;
            });
            await gateway.handleMapRequest(mockData);
            expect(Logger.log).toHaveBeenCalledWith(error);
        });
    });
});
