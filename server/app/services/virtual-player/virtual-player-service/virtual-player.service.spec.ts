import { Test, TestingModule } from '@nestjs/testing';
import { VirtualPlayerService } from './virtual-player.service';
import { GameRoomService } from '@app/services/game-room/game-room.service';
import { TimerService } from '@app/services/time/time.service';
import { GameModeService } from '@app/services/game-mode/game-mode.service';
import { VirtualMovementService } from '@app/services/virtual-player/virtual-movement-service/virtual-player-movement.service';
import { GameLogicGateway } from '@app/gateways/game-logic/game-logic.gateway';
import { ModuleRef } from '@nestjs/core';
import { Actions, GameModes, VirtualPlayerTypes } from '@common/enums';
import { Grid, Item, Path, Player, RoomData } from '@common/interfaces';
import { TURN_DELAY } from '@common/constants';
import { GAME_DATA, MOCK_PLAYERS, MOCK_ROOM } from '@common/constants.spec';
import { GridInfo } from '@app/interfaces/item-search-interface';
import { MILLISECOND_MULTIPLIER } from '@app/constants/virtual-player-consts';
import { VirtualSeek } from '@app/interfaces/virtual-player-interfaces';

describe('VirtualPlayerService', () => {
    let service: VirtualPlayerService;
    let mockGameRoomService: jest.Mocked<GameRoomService>;
    let mockTimeService: jest.Mocked<TimerService>;
    let mockGameModeService: jest.Mocked<GameModeService>;
    let mockVirtualMovement: jest.Mocked<VirtualMovementService>;
    let mockGameLogicGateway: jest.Mocked<GameLogicGateway>;
    let mockModuleRef: jest.Mocked<ModuleRef>;

    const mockPlayer: Player = MOCK_PLAYERS[0];

    const mockRoom: RoomData = MOCK_ROOM;
    const gridInfo: GridInfo = {
        grid: mockRoom.map,
        roomId: 'room1',
    };

    beforeEach(async () => {
        mockGameRoomService = {
            rooms: new Map([['room1', mockRoom]]),
        } as unknown as jest.Mocked<GameRoomService>;

        mockTimeService = {
            stopTimer: jest.fn(),
        } as unknown as jest.Mocked<TimerService>;

        mockGameModeService = {
            isPartOfTeam: jest.fn().mockReturnValue(false),
            nextTurn: jest.fn(),
        } as unknown as jest.Mocked<GameModeService>;

        mockVirtualMovement = {
            moveVirtualPlayer: jest.fn().mockResolvedValue(false),
            getPlayerPositions: jest.fn().mockReturnValue([]),
            findNearestPath: jest.fn().mockReturnValue({ positions: [] }),
            findPathToExactPosition: jest.fn(),
            checkAdjacentPositions: jest.fn(),
            getItemPositions: jest.fn(),
            seekItems: jest.fn().mockResolvedValue(false),
            delay: jest.fn().mockResolvedValue(undefined),
            getAdjacentPositions: jest.fn().mockReturnValue([]),
        } as unknown as jest.Mocked<VirtualMovementService>;

        mockGameLogicGateway = {
            handleEndTurn: jest.fn(),
            handlePlayerAction: jest.fn(),
            handleCombatAction: jest.fn(),
            server: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
        } as unknown as jest.Mocked<GameLogicGateway>;

        mockModuleRef = {
            get: jest.fn().mockReturnValue(mockGameLogicGateway),
        } as unknown as jest.Mocked<ModuleRef>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VirtualPlayerService,
                { provide: ModuleRef, useValue: mockModuleRef },
                { provide: GameRoomService, useValue: mockGameRoomService },
                { provide: TimerService, useValue: mockTimeService },
                { provide: GameModeService, useValue: mockGameModeService },
                { provide: VirtualMovementService, useValue: mockVirtualMovement },
            ],
        }).compile();
        service = module.get<VirtualPlayerService>(VirtualPlayerService);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).gameLogicGateway = mockGameLogicGateway;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('onModuleInit', () => {
        it('should initialize gameLogicGateway', () => {
            service.onModuleInit();
            expect(mockModuleRef.get).toHaveBeenCalledWith(GameLogicGateway);
        });
    });

    describe('turnAction', () => {
        it('should execute turn sequence after delay', async () => {
            mockPlayer.inventory = undefined;
            mockGameRoomService.rooms.get = jest.fn().mockReturnValue(mockRoom);
            jest.useFakeTimers();
            service['captureTheFlagSequence'] = jest.fn();
            service.turnAction('room1', mockPlayer);
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            jest.advanceTimersByTime(10000);
            expect(service['captureTheFlagSequence']).toHaveBeenCalled();
            jest.useRealTimers();
        });
        it('should handle early returns', async () => {
            mockGameRoomService.rooms.get = jest.fn().mockReturnValue(undefined);
            jest.useFakeTimers();
            service.turnAction('room1', mockPlayer);
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            jest.advanceTimersByTime(10000);
            expect(mockGameLogicGateway.handleEndTurn).not.toHaveBeenCalled();
            jest.useRealTimers();
        });
        it('should handle errors and end turn', async () => {
            mockGameRoomService.rooms.get = jest.fn().mockReturnValue(mockRoom);
            jest.useFakeTimers();
            service.turnAction('room1', mockPlayer);
            service['captureTheFlagSequence'] = jest.fn().mockImplementation(() => {
                throw new Error('Error');
            });
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            jest.advanceTimersByTime(10000);
            expect(mockGameLogicGateway.handleEndTurn).toHaveBeenCalled();
            jest.useRealTimers();
        });
    });

    describe('combatAnswer', () => {
        it('should choose to escape when defensive and low health', async () => {
            const defensivePlayer = {
                ...mockPlayer,
                type: VirtualPlayerTypes.Defensive,
                stats: { ...mockPlayer.stats, life: 50 },
            };

            jest.useFakeTimers();
            service.combatAnswer(defensivePlayer, 'room1');
            jest.advanceTimersByTime(TURN_DELAY * MILLISECOND_MULTIPLIER + MILLISECOND_MULTIPLIER);

            expect(mockGameLogicGateway.handleCombatAction).toHaveBeenCalledWith(expect.objectContaining({ action: Actions.Escape }));
            jest.useRealTimers();
        });

        it('should choose to attack by default', async () => {
            jest.useFakeTimers();
            service.combatAnswer(mockPlayer, 'room1');
            jest.advanceTimersByTime(TURN_DELAY * MILLISECOND_MULTIPLIER + MILLISECOND_MULTIPLIER);

            expect(mockGameLogicGateway.handleCombatAction).toHaveBeenCalledWith(expect.objectContaining({ action: Actions.Attack }));
            jest.useRealTimers();
        });
    });

    describe('afterCombatTurn', () => {
        it('should continue turn after combat', async () => {
            jest.useFakeTimers();
            service['captureTheFlagSequence'] = jest.fn();
            service.afterCombatTurn(mockPlayer, 'room1');
            jest.advanceTimersByTime(TURN_DELAY * MILLISECOND_MULTIPLIER);
            expect(service['captureTheFlagSequence']).toHaveBeenCalled();
            jest.useRealTimers();
        });
        it('should handle errors  after combat', async () => {
            jest.useFakeTimers();
            service['captureTheFlagSequence'] = jest.fn().mockImplementation(() => {
                throw new Error('Error');
            });
            service.afterCombatTurn(mockPlayer, 'room1');
            jest.advanceTimersByTime(TURN_DELAY * MILLISECOND_MULTIPLIER);
            expect(mockGameLogicGateway.handleEndTurn).toHaveBeenCalled();
            jest.useRealTimers();
        });
        it('should return early if no rooms', async () => {
            jest.useFakeTimers();
            service.afterCombatTurn(mockPlayer, 'room2');
            jest.advanceTimersByTime(TURN_DELAY * MILLISECOND_MULTIPLIER);
            jest.useRealTimers();
            expect(mockGameLogicGateway.handleEndTurn).not.toHaveBeenCalled();
        });
    });

    describe('captureTheFlagSequence', () => {
        it('should seek flag in CTF mode', async () => {
            const ctfRoom = {
                ...mockRoom,
                map: { ...mockRoom.map, gameMode: GameModes.CTF },
            };
            mockPlayer.startingPoint = { x: 0, y: 0 };
            mockGameRoomService.rooms.get = jest.fn().mockReturnValue(ctfRoom);
            await service['seekItems'](mockPlayer, { roomId: 'room1', grid: GAME_DATA as Grid }, { isOffensive: true, isLookingForFlag: true });

            const result = await service['captureTheFlagSequence'](ctfRoom, mockPlayer, {
                grid: ctfRoom.map,
                roomId: 'room1',
            });

            expect(result).toBe(true);
        });
    });

    describe('defensiveSequence', () => {
        it('should seek defense items first', async () => {
            service['seekDefenseItems'] = jest.fn().mockResolvedValue(true);

            await service['defensiveSequence'](mockPlayer, { grid: mockRoom.map, roomId: 'room1' }, mockRoom);

            expect(service['seekDefenseItems']).toHaveBeenCalled();
        });
    });

    describe('aggressiveSequence', () => {
        it('should seek players or items', async () => {
            service['seekPlayers'] = jest.fn().mockResolvedValue(true);
            await service['aggressiveSequence'](mockPlayer, { grid: mockRoom.map, roomId: 'room1' }, mockRoom);

            expect(service['seekPlayers']).toHaveBeenCalled();
        });
    });

    describe('flagTakenSequence', () => {
        let flagHolder = { ...mockPlayer, id: 'player2' };
        let ctfRoom = {
            ...mockRoom,
            map: { ...mockRoom.map, gameMode: GameModes.CTF },
            flagHolderId: 'player2',
            players: [mockPlayer, flagHolder],
        };
        it('should handle flag taken by opponent', async () => {
            mockVirtualMovement.findNearestPath.mockReturnValue({ positions: [], cost: 0, turns: 0 });
            mockGameRoomService.rooms.get = jest.fn().mockReturnValue(ctfRoom);
            const result = await service['flagTakenSequence'](ctfRoom, mockPlayer, {
                grid: ctfRoom.map,
                roomId: 'room1',
                flagHolder,
            });

            expect(result).toBe(true);
            expect(mockVirtualMovement.moveVirtualPlayer).toHaveBeenCalled();

            mockPlayer.type = VirtualPlayerTypes.Defensive;
            await service['flagTakenSequence'](ctfRoom, mockPlayer, {
                grid: ctfRoom.map,
                roomId: 'room1',
                flagHolder,
            });
            expect(mockVirtualMovement.moveVirtualPlayer).toHaveBeenCalled();
        });
        it('should handle flag taken by yourself', async () => {
            flagHolder = { ...mockPlayer };
            ctfRoom = {
                ...mockRoom,
                map: { ...mockRoom.map, gameMode: GameModes.CTF },
                flagHolderId: mockPlayer.id,
                players: [mockPlayer, flagHolder],
            };
            service['hasFlagSequence'] = jest.fn().mockResolvedValue(true);
            mockGameRoomService.rooms.get = jest.fn().mockReturnValue(ctfRoom);
            mockVirtualMovement.findNearestPath.mockReturnValue({ positions: [], cost: 0, turns: 0 });
            await service['flagTakenSequence'](ctfRoom, mockPlayer, {
                grid: ctfRoom.map,
                roomId: 'room1',
                flagHolder,
            });

            expect(service['hasFlagSequence']).toHaveBeenCalled();
        });
    });
    describe('seek', () => {
        const seekPlayer = { ...mockPlayer, inventory: mockPlayer.inventory, seekResult: mockPlayer.seekResult };
        seekPlayer.inventory = ['item1' as unknown as Item, 'item2' as unknown as Item];
        seekPlayer.seekResult.hasActionsLeft = true;
        const seekParams = {
            player: seekPlayer,
            gridInfo,
            room: mockRoom,
            roomId: 'room1',
        } as VirtualSeek;
        describe('seekDirectPlayerOrItems', () => {
            it('should seek players and items', async () => {
                service['seekPlayers'] = jest.fn().mockResolvedValue(false);
                service['seekItems'] = jest.fn().mockResolvedValue(true);
                await service['seekDirectPlayerOrItems'](seekParams);
                expect(service['seekItems']).toHaveBeenCalled();
            });
            it('should return early if found player', async () => {
                service['seekPlayers'] = jest.fn().mockResolvedValue(true);
                await service['seekDirectPlayerOrItems'](seekParams);
                expect(service['seekPlayers']).toHaveBeenCalled();
            });
        });
        describe('seekItems', () => {
            it('should return early if no speed', async () => {
                seekPlayer.stats.speed = 0;
                await service['seekItems'](seekPlayer, gridInfo, { isOffensive: true, isLookingForFlag: false });
                expect(mockVirtualMovement.getItemPositions).not.toHaveBeenCalled();
            });
            it('should seek items', async () => {
                seekPlayer.stats.speed = 6;
                mockVirtualMovement.getItemPositions.mockReturnValue([{ x: 1, y: 1 }]);
                mockVirtualMovement.findPathToExactPosition.mockReturnValue({} as Path);
                await service['seekItems'](seekPlayer, gridInfo, { isOffensive: true, isLookingForFlag: false });
                expect(mockVirtualMovement.getItemPositions).toHaveBeenCalled();
            });
            it('should seek for flag', async () => {
                seekPlayer.stats.speed = 6;
                mockVirtualMovement.getItemPositions.mockReturnValue([{ x: 1, y: 1 }]);
                mockVirtualMovement.findPathToExactPosition.mockReturnValue(undefined);
                await service['seekItems'](seekPlayer, gridInfo, { isOffensive: true, isLookingForFlag: true });
                expect(mockVirtualMovement.getItemPositions).toHaveBeenCalled();
            });
            it('should return false', async () => {
                seekPlayer.stats.speed = 6;
                mockVirtualMovement.getItemPositions.mockReturnValue([{ x: 1, y: 1 }]);
                mockVirtualMovement.findPathToExactPosition.mockReturnValue(undefined);
                const result = await service['seekItems'](seekPlayer, gridInfo, { isOffensive: true, isLookingForFlag: false });
                expect(result).toBeFalsy();
            });
        });
        describe('seekDefenseItems', () => {
            it('should return early', async () => {
                expect(await service['seekDefenseItems'](seekPlayer, gridInfo)).toBe(true);
            });
            it('should go through all loops', async () => {
                seekPlayer.inventory = [];
                service['seekItems'] = jest.fn().mockResolvedValue(false);
                expect(await service['seekDefenseItems'](seekPlayer, gridInfo)).toBe(false);
            });
            it('should return early on the first loop', async () => {
                seekPlayer.inventory = [];
                service['seekItems'] = jest.fn().mockImplementation(() => {
                    seekPlayer.inventory = ['item1' as unknown as Item, 'item2' as unknown as Item];
                    return true;
                });
                expect(await service['seekDefenseItems'](seekPlayer, gridInfo)).toBe(true);
            });
            it('should return early on the second loop', async () => {
                seekPlayer.inventory = [];
                service['seekItems'] = jest
                    .fn()
                    .mockImplementationOnce(() => {
                        return false;
                    })
                    .mockImplementationOnce(() => {
                        seekPlayer.inventory = ['item1' as unknown as Item, 'item2' as unknown as Item];
                        return true;
                    });
                expect(await service['seekDefenseItems'](seekPlayer, gridInfo)).toBe(true);
            });
            describe('seekPlayers', () => {
                it('should seek players', async () => {
                    seekPlayer.stats.speed = 6;
                    service['getPlayerTarget'] = jest.fn().mockReturnValue({ positions: [{ x: 1, y: 1 }] });
                    await service['seekPlayers'](seekParams);
                    expect(mockVirtualMovement.moveVirtualPlayer).toHaveBeenCalled();
                });
            });
            describe('seekPlayerEnd', () => {
                it('should seek player end', async () => {
                    service['checkAdjacentPlayers'] = jest.fn().mockReturnValue(MOCK_PLAYERS[1]);
                    expect(await service['seekPlayerEnd'](seekParams)).toBe(true);
                });
            });
        });
        describe('checkAdjacentPlayers', () => {
            it('should return player', () => {
                mockPlayer.position = { x: 0, y: 0 };
                mockRoom.map.board[0][1].player = MOCK_PLAYERS[2];
                mockVirtualMovement.checkAdjacentPositions.mockImplementation((pos, grid, callback) => {
                    return callback({ x: 0, y: 1 }, mockRoom.map.board[0][1]);
                });
                expect(
                    service['checkAdjacentPlayers'](mockPlayer, {
                        teams: [[MOCK_PLAYERS[0], MOCK_PLAYERS[1]], [MOCK_PLAYERS[2]]],
                        players: [...MOCK_PLAYERS],
                        grid: mockRoom.map,
                    } as unknown as RoomData),
                ).toBeDefined();
                mockVirtualMovement.checkAdjacentPositions.mockImplementation((pos, grid, callback) => {
                    return callback({ x: 0, y: 1 }, mockRoom.map.board[0][1]);
                });
                expect(
                    // eslint-disable-next-line max-lines
                    service['checkAdjacentPlayers'](mockPlayer, {
                        teams: undefined,
                        players: [...MOCK_PLAYERS],
                        grid: mockRoom.map,
                    } as unknown as RoomData),
                ).toBeDefined();
            });
            it('should return undefined if there are no players', () => {
                mockVirtualMovement.checkAdjacentPositions.mockImplementation((pos, grid, callback) => {
                    return callback({ x: 5, y: 5 }, mockRoom.map.board[4][4]);
                });
                expect(
                    service['checkAdjacentPlayers'](mockPlayer, {
                        teams: [[MOCK_PLAYERS[0], MOCK_PLAYERS[1]], [MOCK_PLAYERS[2]]],
                        players: [...MOCK_PLAYERS],
                        grid: mockRoom.map,
                    } as unknown as RoomData),
                ).toBeUndefined();
                mockVirtualMovement.checkAdjacentPositions.mockImplementation((pos, grid, callback) => {
                    return callback({ x: 5, y: 5 }, mockRoom.map.board[4][4]);
                });
                expect(
                    service['checkAdjacentPlayers'](mockPlayer, {
                        teams: undefined,
                        players: [...MOCK_PLAYERS],
                        grid: mockRoom.map,
                    } as unknown as RoomData),
                ).toBeUndefined();
            });
        });
        describe('virtualPlayerTurnSequence', () => {
            it('should call defensiveSequence', () => {
                mockPlayer.type = VirtualPlayerTypes.Defensive;
                service['defensiveSequence'] = jest.fn();
                service['virtualPlayerTurnSequence'](mockPlayer, gridInfo, mockRoom);
                expect(service['defensiveSequence']).toHaveBeenCalled();
            });
            it('should call flagTakenSequence', async () => {
                service['flagTakenSequence'] = jest.fn();
                mockRoom.flagHolderId = mockPlayer.id;
                mockRoom.map.gameMode = GameModes.CTF;
                await service['captureTheFlagSequence'](mockRoom, mockPlayer, gridInfo);
                expect(service['flagTakenSequence']).toHaveBeenCalled();
            });
            it('isOpponentOnStartingPoint should return true', () => {
                mockPlayer.startingPoint = { x: 0, y: 0 };
                gridInfo.grid.board[0][0].player = MOCK_PLAYERS[2];
                mockRoom.teams = [[MOCK_PLAYERS[0], MOCK_PLAYERS[1]], [MOCK_PLAYERS[2]]];
                mockVirtualMovement.getAdjacentPositions.mockReturnValue([{ x: 0, y: 0 }]);
                expect(service['isOpponentOnStartingPoint'](mockPlayer, gridInfo, mockRoom)).toBe(true);
            });
        });
        describe('hasFlagSequence', () => {
            it('should move player to startingPoint', async () => {
                service['hasFlag'] = jest.fn().mockReturnValue(true);
                mockVirtualMovement.findPathToExactPosition.mockReturnValue({} as Path);
                service['isOpponentOnStartingPoint'] = jest.fn().mockReturnValue(true);
                const result = await service['hasFlagSequence'](mockPlayer, gridInfo, mockRoom);
                expect(mockVirtualMovement.moveVirtualPlayer).toHaveBeenCalled();
                expect(result).toBe(true);
            });
            it('should move player near startingPoint', async () => {
                service['hasFlag'] = jest.fn().mockReturnValue(true);
                mockVirtualMovement.findPathToExactPosition.mockReturnValue(undefined);
                mockVirtualMovement.findNearestPath.mockReturnValue({} as Path);
                await service['hasFlagSequence'](mockPlayer, gridInfo, mockRoom);
                expect(mockVirtualMovement.moveVirtualPlayer).toHaveBeenCalled();
            });
        });
        describe('flagTakenOffensive', () => {
            it('should trigger player to cell combat', async () => {
                mockPlayer.seekResult.hasActionsLeft = true;
                mockPlayer.type = VirtualPlayerTypes.Aggressive;
                gridInfo.flagHolder = mockPlayer;
                service['checkAdjacentPlayers'] = jest.fn().mockReturnValue(MOCK_PLAYERS[1]);
                service['handleCombatEncounter'] = jest.fn();
                await service['flagTakenOffensive'](mockPlayer, gridInfo, mockRoom);
                expect(service['handleCombatEncounter']).toHaveBeenCalled();
            });
        });
    });
    describe('shouldEscape', () => {
        const testPlayer = { ...mockPlayer };
        testPlayer.type = VirtualPlayerTypes.Defensive;

        it('should return true for defensive player with remaining escape attempts and damaged life', () => {
            expect(service['shouldEscape'](testPlayer)).toBe(true);
        });

        it('should return false for non-defensive player', () => {
            const nonDefensivePlayer = { ...testPlayer, type: VirtualPlayerTypes.Aggressive };
            expect(service['shouldEscape'](nonDefensivePlayer)).toBe(false);
        });

        it('should return false when no escape attempts remain', () => {
            const noAttemptsPlayer = { ...testPlayer, escapeAttempts: 0 };
            expect(service['shouldEscape'](noAttemptsPlayer)).toBe(false);
        });

        it('should return false when escapeAttempts is undefined', () => {
            const undefinedAttemptsPlayer = { ...testPlayer, escapeAttempts: undefined };
            expect(service['shouldEscape'](undefinedAttemptsPlayer)).toBe(true);
        });

        it('should return false when at full health', () => {
            const fullHealthPlayer = { ...testPlayer, stats: { ...testPlayer.stats, life: 100, maxLife: 100 } };
            expect(service['shouldEscape'](fullHealthPlayer)).toBe(false);
        });
    });
});
