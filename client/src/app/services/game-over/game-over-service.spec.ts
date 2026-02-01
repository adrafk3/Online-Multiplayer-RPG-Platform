import { provideHttpClient } from '@angular/common/http';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AlertService } from '@app/services/alert/alert.service';
import { GameOverService } from '@app/services/game-over/game-over-service';
import { SocketService } from '@app/services/socket/socket.service';
import { TurnService } from '@app/services/turn/turn-service';
import { MOCK_PLAYERS } from '@common/constants.spec';
import { CombatResults, GameModes } from '@common/enums';
import { ActiveGameEvents } from '@common/gateway-events';
import { CombatUpdate, Grid, Player } from '@common/interfaces';
import { BehaviorSubject, Subject } from 'rxjs';
import { GameModeService } from '@app/services/game-mode/game-mode.service';
import { ActiveGridService } from '@app/services/active-grid/active-grid.service';
import { SNACKBAR_TIME, WINNING_CONDITION } from '@common/constants';

describe('GameOverService', () => {
    let service: GameOverService;
    let mockSocketService: jasmine.SpyObj<SocketService>;
    let mockAlertService: jasmine.SpyObj<AlertService>;
    let mockTurnService: jasmine.SpyObj<TurnService>;
    let gameOverSubject: BehaviorSubject<ActiveGameEvents | undefined>;
    let winnerSubject: BehaviorSubject<Player | undefined>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockGameModeService: jasmine.SpyObj<GameModeService>;
    let mockActiveGridService: jasmine.SpyObj<ActiveGridService>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let socketEventSubject: Subject<any>;

    const MOCK_PLAYER: Player = { id: 'player1', name: 'Player 1', victories: 3, isHost: false, position: { x: 0, y: 0 } };

    beforeEach(() => {
        gameOverSubject = new BehaviorSubject<ActiveGameEvents | undefined>(undefined);
        winnerSubject = new BehaviorSubject<Player | undefined>(undefined);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        socketEventSubject = new Subject<any>();

        mockTurnService = jasmine.createSpyObj('TurnService', ['removeListeners', 'freezeTurn', 'ngOnDestroy'], {
            playerId: 'player1',
        });
        mockSocketService = jasmine.createSpyObj('SocketService', ['on', 'sendMessage', 'isConnected', 'disconnect', 'off']);
        mockAlertService = jasmine.createSpyObj('AlertService', ['alert', 'announceWinner']);
        mockRouter = jasmine.createSpyObj('Router', ['navigate', 'getCurrentNavigation', 'events', 'createUrlTree', 'serializeUrl']);
        mockGameModeService = jasmine.createSpyObj('GameModeService', [], {
            gameMode: GameModes.Classic,
            winningTeamSubject: new BehaviorSubject<Player[]>([]),
        });
        mockActiveGridService = jasmine.createSpyObj('ActiveGridService', ['deselectPlayer'], {
            roomId: 'room1',
            gridSubject: new BehaviorSubject<Grid>({} as Grid),
        });

        mockSocketService.on.and.callFake((event, callback) => socketEventSubject.subscribe(callback));

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                GameOverService,
                { provide: SocketService, useValue: mockSocketService },
                { provide: AlertService, useValue: mockAlertService },
                { provide: TurnService, useValue: mockTurnService },
                { provide: Router, useValue: mockRouter },
                { provide: GameModeService, useValue: mockGameModeService },
                { provide: ActiveGridService, useValue: mockActiveGridService },
            ],
        });

        service = TestBed.inject(GameOverService);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).alertService = mockAlertService;
        service['_winnerSubject'].next(MOCK_PLAYERS[0]);
        service['_gameOverSubject'].next(ActiveGameEvents.NoMorePlayers);
    });

    afterEach(() => {
        gameOverSubject.complete();
        winnerSubject.complete();
        socketEventSubject.complete();
    });

    it('should create the service', () => {
        expect(service).toBeTruthy();
    });

    it('should initialize socket listeners for game over events', () => {
        service.init();
        expect(mockSocketService.on).toHaveBeenCalledWith(ActiveGameEvents.NoMorePlayers, jasmine.any(Function));
        expect(mockSocketService.on).toHaveBeenCalledWith(ActiveGameEvents.CombatUpdate, jasmine.any(Function));
    });

    it('should return game over status from observable', (done) => {
        service.getGameOverStatus().subscribe((status) => {
            expect(status).toBe(ActiveGameEvents.NoMorePlayers);
            done();
        });

        gameOverSubject.next(ActiveGameEvents.NoMorePlayers);
    });

    it('should turn off listeners for game over events', () => {
        service.turnOffListeners();
        expect(mockSocketService.off).toHaveBeenCalledWith(ActiveGameEvents.CombatUpdate);
        expect(mockSocketService.off).toHaveBeenCalledWith(ActiveGameEvents.NoMorePlayers);
    });

    it('should return winner from observable', (done) => {
        service.getWinner().subscribe((winner) => {
            expect(winner).toEqual(MOCK_PLAYERS[0]);
            done();
        });

        winnerSubject.next(MOCK_PLAYER);
    });

    it('should handle "NoMorePlayers" event', fakeAsync(() => {
        socketEventSubject.next({ player: MOCK_PLAYERS[0] });

        gameOverSubject.next(ActiveGameEvents.NoMorePlayers);
        service.handleGameOver(ActiveGameEvents.NoMorePlayers, undefined, MOCK_PLAYERS[0]);

        expect(mockSocketService.disconnect).toHaveBeenCalled();
        tick(1);

        expect(mockAlertService.alert).toHaveBeenCalledWith('Vous avez été déconnecté, vous étiez le dernier joueur!');
    }));

    it('should handle "NoMorePlayers" event and update state', () => {
        service.init();

        socketEventSubject.next({ player: MOCK_PLAYER });

        service.getGameOverStatus().subscribe((status) => {
            expect(status).toBe(ActiveGameEvents.NoMorePlayers);
        });
    });

    it('should not process game over if _isVictory is true', () => {
        service['_isVictory'] = true;

        service.handleGameOver(ActiveGameEvents.NoMorePlayers, undefined, MOCK_PLAYER);

        expect(mockSocketService.disconnect).not.toHaveBeenCalled();
        expect(mockAlertService.alert).not.toHaveBeenCalled();
    });

    it('should handle socket events and update state correctly', () => {
        service.init();

        const combatUpdateData: CombatUpdate = {
            message: CombatResults.AttackDefeated,
            gameState: {
                players: [MOCK_PLAYERS[0]],
            },
            roomId: 'room1',
        };

        socketEventSubject.next(combatUpdateData);

        service.getGameOverStatus().subscribe((status) => {
            expect(status).toBe(ActiveGameEvents.CombatUpdate);
        });

        service.getWinner().subscribe((winner) => {
            expect(winner).toEqual(MOCK_PLAYERS[0]);
        });
    });

    describe('listenForGameEnded', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let mockGameStats: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let gameEndedCallback: (data: any) => void;

        beforeEach(() => {
            mockRouter.getCurrentNavigation.and.returnValue(null);

            mockGameStats = {
                players: [{ name: 'Player 1', victories: 3 }],
                globalStats: {
                    duration: 120,
                    totalTurns: 15,
                    doorsUsed: ['door1', 'door2'],
                    doorsUsedPercent: 50,
                    tilesVisited: ['A1', 'B2'],
                    tilesVisitedPercentage: 30,
                    flagHolders: ['Player 1'],
                },
            };

            localStorage.clear();
            jasmine.clock().install();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockSocketService.on.and.callFake((event: string, callback: (data: any) => void) => {
                if (event === ActiveGameEvents.GameEnded) {
                    gameEndedCallback = callback;
                }
            });

            service = TestBed.inject(GameOverService);
            service.init();
        });

        afterEach(() => {
            jasmine.clock().uninstall();
            localStorage.clear();
        });

        it('should set gameStats in localStorage and navigate to /end', () => {
            gameEndedCallback(mockGameStats);
            jasmine.clock().tick(SNACKBAR_TIME);

            const storedStats = JSON.parse(localStorage.getItem('gameStats') as string);
            expect(storedStats).toBeTruthy();
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/end']);
        });
        it('should call gameOver when CombatUpdate event with winner is provided', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const gameOverSpy = spyOn(service as any, 'gameOver');
            const winner: Player = MOCK_PLAYERS[0];
            winner.victories = WINNING_CONDITION;
            const currentPlayer = MOCK_PLAYERS[0];
            service.handleGameOver(ActiveGameEvents.CombatUpdate, winner, currentPlayer);
            expect(gameOverSpy).toHaveBeenCalledOnceWith(winner, currentPlayer);
        });
    });

    describe('cleanup', () => {
        it('should turn off all socket listeners and reset game state', () => {
            const gameOverSubjectSpy = spyOn(service['_gameOverSubject'], 'next');
            const winnerSubjectSpy = spyOn(service['_winnerSubject'], 'next');

            service.cleanup();

            expect(mockSocketService.off).toHaveBeenCalledWith(ActiveGameEvents.CombatUpdate);
            expect(mockSocketService.off).toHaveBeenCalledWith(ActiveGameEvents.NoMorePlayers);
            expect(mockSocketService.off).toHaveBeenCalledWith(ActiveGameEvents.GameEnded);

            expect(gameOverSubjectSpy).toHaveBeenCalledWith(undefined);
            expect(winnerSubjectSpy).toHaveBeenCalledWith(undefined);
        });

        it('should call all cleanup methods exactly once', () => {
            const gameOverSubjectSpy = spyOn(service['_gameOverSubject'], 'next');
            const winnerSubjectSpy = spyOn(service['_winnerSubject'], 'next');

            service.cleanup();

            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            expect(mockSocketService.off).toHaveBeenCalledTimes(3);
            expect(gameOverSubjectSpy).toHaveBeenCalledTimes(1);
            expect(winnerSubjectSpy).toHaveBeenCalledTimes(1);
        });

        it('should reset the game over state completely', () => {
            service['_gameOverSubject'].next(ActiveGameEvents.CombatUpdate);
            service['_winnerSubject'].next({} as Player);

            service.cleanup();

            expect(service['_gameOverSubject'].value).toBeUndefined();
            expect(service['_winnerSubject'].value).toBeUndefined();
        });
    });
    describe('Team Mode Winner Announcement', () => {
        beforeEach(() => {
            Object.defineProperty(mockTurnService, 'playerId', {
                get: () => MOCK_PLAYERS[0].id,
            });
            Object.defineProperty(mockGameModeService, 'gameMode', {
                get: () => GameModes.CTF,
            });
            service.init();
        });

        it('should announce victory when current player is in winning team', () => {
            mockGameModeService.winningTeamSubject.next(MOCK_PLAYERS);

            expect(mockAlertService.announceWinner).toHaveBeenCalledWith('VOUS AVEZ GAGNÉ!!!');
            expect(mockSocketService.sendMessage).toHaveBeenCalledWith(ActiveGameEvents.FetchStats, {
                roomId: mockActiveGridService.roomId,
                grid: mockActiveGridService.gridSubject.value,
            });
        });

        it('should announce single winner when one player wins', () => {
            mockGameModeService.winningTeamSubject.next([MOCK_PLAYERS[1]]);

            expect(mockAlertService.announceWinner).toHaveBeenCalledWith('Partie terminée, le gagnant est: Player 2');
        });
        it('should announce winners when one team wins', () => {
            mockGameModeService.winningTeamSubject.next([MOCK_PLAYERS[1], MOCK_PLAYERS[2]]);

            expect(mockAlertService.announceWinner).toHaveBeenCalledWith('Partie terminée, les gagnants sont: Player 2, Player 3');
        });

        it('should not announce anything for empty team', () => {
            mockGameModeService.winningTeamSubject.next([]);
            expect(mockAlertService.announceWinner).not.toHaveBeenCalled();
        });
    });
    it('should handle victory when player meets winning condition (current player wins)', () => {
        const winningPlayer = MOCK_PLAYERS[0];
        winningPlayer.victories = WINNING_CONDITION;
        service['gameOver'](winningPlayer, winningPlayer);

        expect(mockSocketService.sendMessage).toHaveBeenCalledWith(ActiveGameEvents.FetchStats, {
            roomId: mockActiveGridService.roomId,
            grid: mockActiveGridService.gridSubject.value,
        });
        expect(service['_isVictory']).toBeTrue();
        expect(mockAlertService.announceWinner).toHaveBeenCalledWith('VOUS AVEZ GAGNÉ!!!');
    });
    it('should handle victory when  other player meets winning condition (current player wins)', () => {
        const winningPlayer = MOCK_PLAYERS[0];
        winningPlayer.victories = WINNING_CONDITION;
        service['gameOver'](winningPlayer, MOCK_PLAYERS[1]);

        expect(mockSocketService.sendMessage).toHaveBeenCalledWith(ActiveGameEvents.FetchStats, {
            roomId: mockActiveGridService.roomId,
            grid: mockActiveGridService.gridSubject.value,
        });
        expect(service['_isVictory']).toBeTrue();
        expect(mockAlertService.announceWinner).toHaveBeenCalledWith('Partie terminée, le gagnant est: Player 1!');
    });
});
