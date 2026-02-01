import { EndGameService } from '@app/services/end-game/end-game.service';
import { GameRoomService } from '@app/services/game-room/game-room.service';
import { TurnService } from '@app/services/turns/turn-service';
import { GLOBAL_STATS, MOCK_PLAYERS } from '@common/constants.spec';
import { FlagTakenPayload, Player, RoomData } from '@common/interfaces';
import { Position } from '@common/types';
import { Test, TestingModule } from '@nestjs/testing';
import { GameModeService } from './game-mode.service';

describe('GameModeService', () => {
    let service: GameModeService;
    let mockGameRoomService: Partial<GameRoomService>;
    let mockTurnService: jest.Mocked<TurnService>;
    let mockEndGameService: jest.Mocked<EndGameService>;

    const mockPlayer1: Player = MOCK_PLAYERS[0];
    const mockPlayer2: Player = MOCK_PLAYERS[2];
    const mockPlayer3: Player = MOCK_PLAYERS[1];

    const mockRoom: RoomData = {
        players: [mockPlayer1, mockPlayer2],
        selectedAvatars: new Map(),
        playerMax: 4,
        playerMin: 2,
        isLocked: false,
        teams: [[mockPlayer1], [mockPlayer2]],
        globalStats: GLOBAL_STATS,
    };

    beforeEach(async () => {
        mockGameRoomService = {
            rooms: new Map<string, RoomData>([['room1', mockRoom]]),
        };

        mockTurnService = {
            nextTurn: jest.fn(),
        } as unknown as jest.Mocked<TurnService>;

        mockEndGameService = {
            setTilesVisitedPercentage: jest.fn(),
            setGlobalStats: jest.fn(),
        } as unknown as jest.Mocked<EndGameService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GameModeService,
                {
                    provide: EndGameService,
                    useValue: mockEndGameService,
                },
                {
                    provide: GameRoomService,
                    useValue: mockGameRoomService,
                },
                {
                    provide: TurnService,
                    useValue: mockTurnService,
                },
            ],
        }).compile();

        service = module.get<GameModeService>(GameModeService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('flagTaken', () => {
        it('should set flagHolderId and return the flag holder player', () => {
            const payload: FlagTakenPayload = {
                roomId: 'room1',
                flagHolderId: mockPlayer1.id,
            };

            const result = service.flagTaken(payload);
            expect(result).toEqual(mockPlayer1);
            expect(mockGameRoomService.rooms.get('room1').flagHolderId).toBe(mockPlayer1.id);
        });

        it('should return undefined if room does not exist', () => {
            const payload: FlagTakenPayload = {
                roomId: 'nonexistent',
                flagHolderId: mockPlayer1.id,
            };

            const result = service.flagTaken(payload);
            expect(result).toBeUndefined();
        });
    });

    describe('flagDropped', () => {
        it('should clear flagHolderId', () => {
            mockGameRoomService.rooms.get('room1').flagHolderId = mockPlayer1.name;
            service.flagDropped('room1');
            expect(mockGameRoomService.rooms.get('room1').flagHolderId).toBeUndefined();
        });

        it('should do nothing if room does not exist', () => {
            expect(() => service.flagDropped('nonexistent')).not.toThrow();
        });
    });

    describe('checkFlagCaptured', () => {
        it('should call flagCaptured when flag holder is at starting point', () => {
            const playerWithStartingPoint = {
                ...mockPlayer1,
                startingPoint: { x: 0, y: 0 },
                position: { x: 0, y: 0 },
            };

            mockGameRoomService.rooms.get('room1').flagHolderId = 'player1000';
            const spy = jest.spyOn(service, 'flagCaptured');

            service.checkFlagCaptured('room1', playerWithStartingPoint);
            expect(spy).toHaveBeenCalledWith('room1');
        });

        it('should not call flagCaptured when flag holder is not at starting point', () => {
            mockGameRoomService.rooms.get('room1').flagHolderId = 'player1';
            const spy = jest.spyOn(service, 'flagCaptured');

            service.checkFlagCaptured('room1', mockPlayer1);
            expect(spy).not.toHaveBeenCalled();
        });

        it('should not call flagCaptured when no flag holder', () => {
            mockGameRoomService.rooms.get('room1').flagHolderId = undefined;
            const spy = jest.spyOn(service, 'flagCaptured');

            service.checkFlagCaptured('room1', mockPlayer1);
            expect(spy).not.toHaveBeenCalled();
        });
    });

    describe('flagCaptured', () => {
        it('should increment victories for the winning team and return the team', () => {
            const mockPlayer1WithVictories = { ...MOCK_PLAYERS[0], victories: 5 };
            const mockPlayer2WithVictories = { ...MOCK_PLAYERS[2], victories: 3 };
            const testRoom = {
                ...mockRoom,
                players: [mockPlayer1WithVictories, mockPlayer2WithVictories],
                teams: [[mockPlayer1WithVictories], [mockPlayer2WithVictories]],
                flagHolderId: mockPlayer1WithVictories.id,
            };
            mockGameRoomService.rooms.set('victory-test-room', testRoom);
            const result = service.flagCaptured('victory-test-room');
            expect(result).toEqual([mockPlayer1WithVictories]);
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            expect(mockPlayer1WithVictories.victories).toBe(6); // 5 + 1
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            expect(mockPlayer2WithVictories.victories).toBe(3);
        });

        it('should return undefined if room does not exist', () => {
            const result = service.flagCaptured('nonexistent');
            expect(result).toBeUndefined();
        });

        it('should return undefined if no teams exist', () => {
            const roomWithoutTeams = { ...mockRoom, teams: undefined };
            mockGameRoomService.rooms.set('room2', roomWithoutTeams);
            mockGameRoomService.rooms.get('room2').flagHolderId = 'player1';

            const result = service.flagCaptured('room2');
            expect(result).toBeUndefined();
        });

        it('should increment victories even when player.victories is undefined', () => {
            const playerWithoutVictories = { ...mockPlayer1, victories: undefined };
            const modifiedRoom = {
                ...mockRoom,
                players: [playerWithoutVictories, mockPlayer2],
                teams: [[playerWithoutVictories], [mockPlayer2]],
            };
            mockGameRoomService.rooms.set('room4', modifiedRoom);
            modifiedRoom.flagHolderId = playerWithoutVictories.id;

            const result = service.flagCaptured('room4');
            expect(result).toEqual([playerWithoutVictories]);
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            expect(playerWithoutVictories.victories).toBe(1);
        });
    });

    describe('isPartOfTeam', () => {
        it('should return true when both players are in the same team', () => {
            const teamWithBothPlayers = [[mockPlayer1, mockPlayer3], [mockPlayer2]];
            const result = service.isPartOfTeam(mockPlayer1, mockPlayer3, teamWithBothPlayers);
            expect(result).toBe(true);
        });

        it('should return false when players are in different teams', () => {
            const result = service.isPartOfTeam(mockPlayer1, mockPlayer2, mockRoom.teams);
            expect(result).toBe(false);
        });

        it('should return false when teams array is empty', () => {
            const result = service.isPartOfTeam(mockPlayer1, mockPlayer2, []);
            expect(result).toBe(false);
        });

        it('should return false when teams are undefined', () => {
            const result = service.isPartOfTeam(mockPlayer1, mockPlayer2, undefined);
            expect(result).toBe(false);
        });

        it('should return false when one player is not in any team', () => {
            const teamsWithoutPlayer2 = [[mockPlayer1], [mockPlayer3]];
            const result = service.isPartOfTeam(mockPlayer1, mockPlayer2, teamsWithoutPlayer2);
            expect(result).toBe(false);
        });
    });

    describe('setTilesVisited', () => {
        it('should call endService.setTilesVisitedPercentage with correct parameters', () => {
            const nextPosition: Position = { x: 5, y: 5 };
            service.setTilesVisited(mockRoom, mockPlayer1, nextPosition);
            expect(mockEndGameService.setTilesVisitedPercentage).toHaveBeenCalledWith(mockRoom, mockPlayer1, nextPosition);
        });
    });

    describe('setGlobalStats', () => {
        it('should call endService.setGlobalStats with correct room', () => {
            service.setGlobalStats(mockRoom);
            expect(mockEndGameService.setGlobalStats).toHaveBeenCalledWith(mockRoom);
        });
    });

    describe('nextTurn', () => {
        it('should call turnService.nextTurn with correct roomId', () => {
            const roomId = 'test-room';
            service.nextTurn(roomId);
            expect(mockTurnService.nextTurn).toHaveBeenCalledWith(roomId);
        });
    });
});
