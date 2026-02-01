import { TileTypes, GameModes } from './../../../../../common/enums';
import { TestBed } from '@angular/core/testing';
import { GameModeService } from './game-mode.service';
import { PlayerService } from '@app/services/player/player.service';
import { SocketService } from '@app/services/socket/socket.service';
import { FlagCapturedPayload, FlagHolderPayload, Player, BoardCell } from '@common/interfaces';
import { CTFEvents, ActiveGameEvents } from '@common/gateway-events';
import { BehaviorSubject } from 'rxjs';
import { MOCK_PLAYERS } from '@common/constants.spec';

describe('GameModeService', () => {
    let service: GameModeService;
    let socketServiceSpy: jasmine.SpyObj<SocketService>;
    let playerServiceSpy: jasmine.SpyObj<PlayerService>;

    const mockPlayer: Player = MOCK_PLAYERS[0];
    const mockPlayer2: Player = MOCK_PLAYERS[1];

    const mockTeams: Player[][] = [[mockPlayer], [mockPlayer2]];

    beforeEach(() => {
        playerServiceSpy = jasmine.createSpyObj('PlayerService', [], {
            player: mockPlayer,
            roomId: 'test-room',
        });
        socketServiceSpy = jasmine.createSpyObj('SocketService', ['on', 'off', 'sendMessage']);

        TestBed.configureTestingModule({
            providers: [
                GameModeService,
                { provide: PlayerService, useValue: playerServiceSpy },
                { provide: SocketService, useValue: socketServiceSpy },
            ],
        });

        service = TestBed.inject(GameModeService);
        socketServiceSpy = TestBed.inject(SocketService) as jasmine.SpyObj<SocketService>;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('Properties', () => {
        it('should have default properties', () => {
            expect(service.gameMode).toBeUndefined();
            expect(service.teams).toEqual([]);
            expect(service.flagHolder).toBeUndefined();
        });

        it('should set and get gameMode', () => {
            service.gameMode = GameModes.CTF;
            expect(service.gameMode).toBe(GameModes.CTF);
        });

        it('should set and get flagHolder', () => {
            service.flagHolder = mockPlayer;
            expect(service.flagHolder).toEqual(mockPlayer);
        });
    });

    describe('setTeams', () => {
        it('should set teams correctly', () => {
            service.setTeams(mockTeams);
            expect(service.teams.length).toBe(mockTeams.length);
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            expect(service.teams[0].isOwnTeam).toBeTrue();
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            expect(service.teams[1].isOwnTeam).toBeFalse();
        });
    });

    describe('canStartGame', () => {
        it('should return true for non-CTF mode regardless of player count', () => {
            service.gameMode = GameModes.Classic;
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            expect(service.canStartGame(3)).toBeTrue();
        });

        it('should return true for CTF mode with even player count', () => {
            service.gameMode = GameModes.CTF;
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            for (let i = 2; i < 7; i += 2) {
                // eslint-disable-next-line @typescript-eslint/no-magic-numbers
                expect(service.canStartGame(4)).toBeTrue();
            }
        });

        it('should return false for CTF mode with odd player count', () => {
            service.gameMode = GameModes.CTF;
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            for (let i = 1; i < 6; i += 2) {
                // eslint-disable-next-line @typescript-eslint/no-magic-numbers
                expect(service.canStartGame(3)).toBeFalse();
            }
        });
    });

    describe('getTeamNumber', () => {
        beforeEach(() => {
            service.setTeams(mockTeams);
        });

        it('should return 1 for player in first team', () => {
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            expect(service.getTeamNumber(mockPlayer.id)).toBe(1);
        });

        it('should return 2 for player in second team', () => {
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            expect(service.getTeamNumber(mockPlayer2.id)).toBe(2);
        });
    });

    describe('isPartOfOwnTeam', () => {
        beforeEach(() => {
            service.setTeams(mockTeams);
        });

        it('should return true for player in own team', () => {
            expect(service.isPartOfOwnTeam(mockPlayer.id)).toBeTrue();
        });

        it('should return false for player in other team', () => {
            expect(service.isPartOfOwnTeam(mockPlayer2.id)).toBeFalse();
        });
    });

    describe('makeStartingPointGlow', () => {
        it('should return false when flag is not taken', () => {
            service['_isFlagTaken'] = false;
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            for (let x = 1; x < 11; x += 1) {
                // eslint-disable-next-line @typescript-eslint/no-magic-numbers
                for (let y = 1; y < 11; y += 1) {
                    expect(service.makeStartingPointGlow(x, y)).toBeFalse();
                }
            }
        });

        it('should return true when coordinates match flag goal', () => {
            service['_isFlagTaken'] = true;
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            service['_flagGoal'] = { x: 1, y: 1 };
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            expect(service.makeStartingPointGlow(1, 1)).toBeTrue();
        });

        it('should return false when coordinates do not match flag goal', () => {
            service['_isFlagTaken'] = true;
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            service['_flagGoal'] = { x: 1, y: 1 };
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            expect(service.makeStartingPointGlow(2, 2)).toBeFalse();
        });
    });

    describe('showFlagHolder', () => {
        it('should return false when player is undefined', () => {
            expect(service.showFlagHolder(undefined)).toBeFalse();
        });

        it('should return false when flag holder is not set', () => {
            expect(service.showFlagHolder(mockPlayer)).toBeFalse();
        });

        it('should return true when player is flag holder', () => {
            service.flagHolder = mockPlayer;
            expect(service.showFlagHolder(mockPlayer)).toBeTrue();
        });

        it('should return false when player is not flag holder', () => {
            service.flagHolder = { ...mockPlayer, id: 'otherPlayer' };
            expect(service.showFlagHolder(mockPlayer)).toBeFalse();
        });
    });

    describe('isCtf', () => {
        it('should return false when game mode is not CTF', () => {
            service.gameMode = GameModes.Classic;
            expect(service.isCtf()).toBeFalse();
        });

        it('should return true when game mode is CTF and teams are set', () => {
            service.gameMode = GameModes.CTF;
            service.setTeams(mockTeams);
            expect(service.isCtf()).toBeTrue();
        });
    });

    describe('onInit', () => {
        it('should set up CTF listeners when game mode is CTF', () => {
            service.gameMode = GameModes.CTF;
            service.onInit();
            expect(socketServiceSpy.on).toHaveBeenCalledWith(CTFEvents.FlagTaken, jasmine.any(Function));
            expect(socketServiceSpy.on).toHaveBeenCalledWith(CTFEvents.FlagDropped, jasmine.any(Function));
            expect(socketServiceSpy.on).toHaveBeenCalledWith(CTFEvents.FlagCaptured, jasmine.any(Function));
            expect(service['_isInitialised']).toBeTrue();
        });

        it('should not set up CTF listeners when game mode is not CTF', () => {
            service.gameMode = GameModes.Classic;
            service.onInit();
            expect(socketServiceSpy.on).not.toHaveBeenCalled();
        });

        it('should not set up CTF listeners when already initialized', () => {
            service.gameMode = GameModes.CTF;
            service['_isInitialised'] = true;
            service.onInit();
            expect(socketServiceSpy.on).not.toHaveBeenCalled();
        });
    });

    describe('CTF Event Listeners', () => {
        beforeEach(() => {
            service.gameMode = GameModes.CTF;
            service.onInit();
        });

        it('should handle FlagTaken event', () => {
            const flagHolderPayload: FlagHolderPayload = {
                flagHolder: mockPlayer,
            };
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            const callback = socketServiceSpy.on.calls.argsFor(0)[1] as (data: FlagHolderPayload) => void;
            callback(flagHolderPayload);

            expect(service['_isFlagTaken']).toBeTrue();
            expect(service['_flagGoal']).toEqual(mockPlayer.startingPoint);
            expect(service['_flagHolder']).toEqual(mockPlayer);
        });

        it('should handle FlagDropped event', () => {
            service['_isFlagTaken'] = true;
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            service['_flagGoal'] = { x: 1, y: 1 };
            service['_flagHolder'] = mockPlayer;

            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            const callback = socketServiceSpy.on.calls.argsFor(1)[1] as () => void;
            callback();

            expect(service['_isFlagTaken']).toBeFalse();
            expect(service['_flagGoal']).toBeUndefined();
            expect(service['_flagHolder']).toBeUndefined();
        });

        it('should handle FlagCaptured event', () => {
            const flagCapturedPayload: FlagCapturedPayload = {
                winningTeam: [mockPlayer],
            };
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            const callback = socketServiceSpy.on.calls.argsFor(2)[1] as (data: FlagCapturedPayload) => void;
            callback(flagCapturedPayload);

            expect(service['_isFlagTaken']).toBeFalse();
            expect(service['_winningTeamSubject'].value).toEqual([mockPlayer]);
        });
    });

    describe('onReset', () => {
        beforeEach(() => {
            service.gameMode = GameModes.CTF;
            service.setTeams(mockTeams);
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            service['_flagGoal'] = { x: 1, y: 1 };
            service['_flagHolder'] = mockPlayer;
            service['_isFlagTaken'] = true;
            service['_isInitialised'] = true;
            service['_winningTeamSubject'].next([mockPlayer]);
        });

        it('should reset all properties', () => {
            service.onReset();

            expect(service['_teams']).toEqual([]);
            expect(service['_flagGoal']).toBeUndefined();
            expect(service['_flagHolder']).toBeUndefined();
            expect(service['_isFlagTaken']).toBeFalse();
            expect(service['_isInitialised']).toBeFalse();
            expect(service['_winningTeamSubject'].value).toEqual([]);
            expect(socketServiceSpy.off).toHaveBeenCalledWith(CTFEvents.FlagTaken);
            expect(socketServiceSpy.off).toHaveBeenCalledWith(CTFEvents.FlagDropped);
            expect(socketServiceSpy.off).toHaveBeenCalledWith(CTFEvents.FlagCaptured);
        });
    });

    describe('winningTeamSubject', () => {
        it('should return the winning team BehaviorSubject', () => {
            const mockWinningTeam: Player[] = [mockPlayer];
            service['_winningTeamSubject'].next(mockWinningTeam);

            const winningTeamSubject = service.winningTeamSubject;
            expect(winningTeamSubject).toBeInstanceOf(BehaviorSubject);
            expect(winningTeamSubject.value).toEqual(mockWinningTeam);
        });
    });

    describe('sendMap', () => {
        const mockBoard: BoardCell[][] = [
            [
                {
                    tile: TileTypes.Water,
                    item: { name: 'item1', description: 'description1' },
                },
            ],
        ];

        beforeEach(() => {
            (Object.getOwnPropertyDescriptor(playerServiceSpy, 'roomId')?.get as jasmine.Spy).and.returnValue('test-room');
        });

        it('should send map with current roomId and correct event type', () => {
            service.sendMap(mockBoard);

            expect(socketServiceSpy.sendMessage).toHaveBeenCalledWith(ActiveGameEvents.MapRequest, {
                roomId: 'test-room',
                map: mockBoard,
            });
        });

        it('should send the exact map data provided', () => {
            const customMap: BoardCell[][] = [
                [
                    {
                        tile: TileTypes.Default,
                        item: { name: 'special-item', description: 'special-desc' },
                    },
                ],
            ];

            service.sendMap(customMap);

            const sentData = socketServiceSpy.sendMessage.calls.mostRecent().args[1] as { roomId: string; map: BoardCell[][] };
            expect(sentData.map).toBe(customMap);
            expect(sentData.map[0][0].item.name).toBe('special-item');
        });

        it('should use the current roomId from playerService', () => {
            (Object.getOwnPropertyDescriptor(playerServiceSpy, 'roomId')?.get as jasmine.Spy).and.returnValue('different-room');

            service.sendMap(mockBoard);

            const sentData = socketServiceSpy.sendMessage.calls.mostRecent().args[1] as { roomId: string; map: BoardCell[][] };
            expect(sentData.roomId).toBe('different-room');
        });
    });
});
