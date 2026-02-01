import { GameLogicGateway } from './game-logic.gateway';
import { GameLogicService } from '@app/services/game-logic/game-logic-service.service';
import { GameModeService } from '@app/services/game-mode/game-mode.service';
import { GameRoomService } from '@app/services/game-room/game-room.service';
import { MOCK_PLAYERS } from '@common/constants.spec';
import { Actions, CombatResults } from '@common/enums';
import { ActiveGameEvents } from '@common/gateway-events';
import { CombatAction, Player, PlayerAction, RoomData } from '@common/interfaces';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'socket.io';
import { CombatService } from '@app/services/combat-logic/combat-logic.service';

describe('GameLogicGateway', () => {
    let gateway: GameLogicGateway;
    let mockGameRoomService: jest.Mocked<GameRoomService>;
    let mockCombatService: jest.Mocked<CombatService>;
    let mockGameModeService: jest.Mocked<GameModeService>;
    let mockGameLogicService: jest.Mocked<GameLogicService>;
    let mockServer: jest.Mocked<Server>;

    const mockPlayer: Player = MOCK_PLAYERS[0];

    const mockTargetPlayer: Player = MOCK_PLAYERS[1];

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

    it('should get server', () => {
        expect(gateway.server).toBeTruthy();
    });

    describe('handlePlayerAction', () => {
        const mockData: PlayerAction = {
            playerId: 'player1',
            roomId: 'room1',
            target: mockTargetPlayer,
            action: Actions.Attack,
        };
        it('should handle combat start and emit CombatInitiated', () => {
            const mockResult = {
                message: CombatResults.CombatStarted,
                gameState: { players: [mockPlayer, mockTargetPlayer] },
            };
            mockCombatService.handleStartCombat.mockReturnValue(mockResult);

            gateway.handlePlayerAction(mockData);

            expect(mockCombatService.handleStartCombat).toHaveBeenCalledWith('player1', 'room1', mockTargetPlayer);
            expect(mockServer.to).toHaveBeenCalledWith('room1');
            expect(mockServer.emit).toHaveBeenCalledWith(ActiveGameEvents.CombatInitiated, mockResult);
        });

        it('should log an error if handlePlayerAction provokes an error', async () => {
            const error = new Error('Async combat error');
            mockCombatService.handleStartCombat.mockImplementation(() => {
                throw error;
            });
            await gateway.handlePlayerAction(mockData);

            expect(Logger.log).toHaveBeenCalledWith(error);
        });
    });

    describe('handleCombatAction', () => {
        const mockData: CombatAction = {
            playerId: 'player1',
            action: Actions.Attack,
            roomId: 'room1',
        };
        let mockResult = {
            message: CombatResults.AttackNotDefeated,
            gameState: {
                players: [mockPlayer, mockTargetPlayer],
                combat: undefined,
            },
        };
        it('should process combat action and emit updates', async () => {
            mockCombatService.processCombatAction.mockReturnValue(mockResult);
            mockGameRoomService.rooms.set('room1', {
                currentTurn: { type: 'human' },
                players: [mockPlayer, mockTargetPlayer],
            } as unknown as RoomData);
            mockGameLogicService.setNextPosition.mockReturnValue({ x: 1, y: 1 });

            await gateway.handleCombatAction(mockData);

            expect(mockCombatService.processCombatAction).toHaveBeenCalledWith(Actions.Attack, 'room1');
            expect(mockServer.emit).toHaveBeenCalledWith(ActiveGameEvents.CombatUpdate, mockResult);
            expect(mockGameLogicService.setNextPosition).toHaveBeenCalled();
        });

        it('should log an error if handlePlayerAction provokes an error', async () => {
            const error = new Error('Async combat error');
            mockCombatService.processCombatAction.mockImplementation(() => {
                throw error;
            });
            await gateway.handleCombatAction(mockData);
            expect(Logger.log).toHaveBeenCalledWith(error);
        });

        it('should handle escape success and end turn', async () => {
            mockData.action = Actions.Escape;
            mockResult = {
                message: CombatResults.EscapeSucceeded,
                gameState: {
                    players: [mockPlayer, mockTargetPlayer],
                    combat: undefined,
                },
            };
            mockCombatService.processCombatAction.mockReturnValue(mockResult);
            mockGameRoomService.rooms.set('room1', {
                currentTurn: { type: 'human' },
                players: [mockPlayer, mockTargetPlayer],
                globalStats: { totalTurns: 0 },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);

            await gateway.handleCombatAction(mockData);

            expect(mockServer.emit).toHaveBeenCalledWith(ActiveGameEvents.CombatUpdate, expect.anything());
        });

        it('should not process combat update if gameState is undefined', async () => {
            mockResult.gameState = undefined;
            mockGameRoomService.rooms.set('room1', {
                currentTurn: { type: 'human' },
                players: [mockPlayer, mockTargetPlayer],
                globalStats: { totalTurns: 0 },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);
            mockCombatService.processCombatAction.mockReturnValue(mockResult);
            await gateway.handleCombatAction(mockData);
            expect(mockServer.emit).toHaveBeenCalledWith(ActiveGameEvents.CombatUpdate, expect.anything());
        });
    });
});
