import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CombatService } from '@app/services/combat/combat.service';
import { PlayerService } from '@app/services/player/player.service';
import { TurnService } from '@app/services/turn/turn-service';
import { MOCK_PLAYERS } from '@common/constants.spec';
import { Player, FlagHolderPayload } from '@common/interfaces';
import { Subject } from 'rxjs';
import { PlayerListComponent } from './player-list.component';
import { GameModeService } from '@app/services/game-mode/game-mode.service';
import { VirtualPlayerTypes } from '@common/enums';
import { SocketService } from '@app/services/socket/socket.service';
import { CTFEvents } from '@common/gateway-events';

describe('PlayerListComponent', () => {
    let component: PlayerListComponent;
    let fixture: ComponentFixture<PlayerListComponent>;
    let mockTurnService: jasmine.SpyObj<TurnService>;
    let mockPlayerService: jasmine.SpyObj<PlayerService>;
    let mockGameModeService: jasmine.SpyObj<GameModeService>;
    let mockSocketService: jasmine.SpyObj<SocketService>;
    let combatWinnerSubject: Subject<string | undefined>;

    let currentTurnSubject: Subject<Player | undefined>;
    let playersSubject: Subject<Player[]>;
    let quittingPlayerIdSubject: Subject<string | undefined>;
    let mockCombatService: jasmine.SpyObj<CombatService>;

    beforeEach(() => {
        currentTurnSubject = new Subject<Player | undefined>();
        playersSubject = new Subject<Player[]>();
        quittingPlayerIdSubject = new Subject<string | undefined>();
        combatWinnerSubject = new Subject<string | undefined>();
        mockCombatService = jasmine.createSpyObj('CombatService', ['getCombatWinner']);
        mockCombatService.getCombatWinner.and.returnValue(combatWinnerSubject.asObservable());

        mockTurnService = jasmine.createSpyObj('TurnService', ['getCurrentTurn', 'getQuittingPlayerId']);
        mockPlayerService = jasmine.createSpyObj('PlayerService', ['getPlayers']);
        mockGameModeService = jasmine.createSpyObj('GameModeService', ['getTeamNumber', 'isPartOfOwnTeam', 'isCtf']);
        mockSocketService = jasmine.createSpyObj('SocketService', ['on', 'off']);
        mockSocketService.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === CTFEvents.FlagTaken) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (mockSocketService as any).flagTakenCallback = callback;
            } else if (event === CTFEvents.FlagDropped) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (mockSocketService as any).flagDroppedCallback = callback;
            }
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            return () => {};
        });

        mockTurnService.getCurrentTurn.and.returnValue(currentTurnSubject.asObservable());
        mockPlayerService.getPlayers.and.returnValue(playersSubject.asObservable());
        mockTurnService.getQuittingPlayerId.and.returnValue(quittingPlayerIdSubject.asObservable());

        TestBed.configureTestingModule({
            imports: [PlayerListComponent],
            providers: [
                { provide: TurnService, useValue: mockTurnService },
                { provide: PlayerService, useValue: mockPlayerService },
                { provide: CombatService, useValue: mockCombatService },
                { provide: GameModeService, useValue: mockGameModeService },
                { provide: SocketService, useValue: mockSocketService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayerListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        component.ngOnDestroy();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize players on first emission from playerService', () => {
        playersSubject.next(MOCK_PLAYERS);

        expect(component.staticPlayers).toEqual(MOCK_PLAYERS);
    });

    it('should not update players after initial load', () => {
        playersSubject.next(MOCK_PLAYERS);
        playersSubject.next([{ id: 'new-player', name: 'New Player', victories: 0, isHost: false }]);

        expect(component.staticPlayers).toEqual(MOCK_PLAYERS);
    });

    it('should update the current turn when getCurrentTurn emits', () => {
        currentTurnSubject.next(MOCK_PLAYERS[0]);

        expect(component.currentTurn).toEqual(MOCK_PLAYERS[0]);
    });

    it('should add a player to disconnectedPlayers when quittingPlayerId is emitted', () => {
        playersSubject.next(MOCK_PLAYERS);

        quittingPlayerIdSubject.next(MOCK_PLAYERS[0].id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((component as any)._disconnectedPlayers).toContain(MOCK_PLAYERS[0]);
    });

    it('should not add player to disconnectedPlayers if playerId is not in players list', () => {
        playersSubject.next(MOCK_PLAYERS);

        quittingPlayerIdSubject.next('invalid-id');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((component as any)._disconnectedPlayers.length).toBe(0);
    });

    it('should return true from isPlayerDisconnected if player is disconnected', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (component as any)._staticPlayers = MOCK_PLAYERS;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (component as any)._disconnectedPlayers = [MOCK_PLAYERS[0]];

        expect(component.isPlayerDisconnected(MOCK_PLAYERS[0].id)).toBeTrue();
    });

    it('should return false from isPlayerDisconnected if player is not disconnected', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (component as any)._disconnectedPlayers = [MOCK_PLAYERS[0]];

        expect(component.isPlayerDisconnected(MOCK_PLAYERS[1].id)).toBeFalse();
    });

    it('should unsubscribe from all subscriptions on ngOnDestroy', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const unsubscribeSpy = spyOn((component as any)._subscription, 'unsubscribe');
        component.ngOnDestroy();
        expect(unsubscribeSpy).toHaveBeenCalled();
    });

    it('should not update players if players list is empty', () => {
        expect(component.staticPlayers.length).toBe(0);

        playersSubject.next(MOCK_PLAYERS);
        expect(component.staticPlayers).toEqual(MOCK_PLAYERS);

        const newPlayers = [{ id: 'new-id', name: 'New Player', victories: 0, isHost: false }];
        playersSubject.next(newPlayers);

        expect(component.staticPlayers).toEqual(MOCK_PLAYERS);
    });

    it('should increment victories when combat winner is announced', () => {
        const player = { id: 'player2', name: 'Player 2', victories: undefined, isHost: false };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (component as any)._staticPlayers = [player];
        combatWinnerSubject.next('player2');

        expect(component.staticPlayers[0].victories).toBe(1);

        player.victories = undefined;

        combatWinnerSubject.next('player2');

        expect(component.staticPlayers[0].victories).toBe(1);
    });
    it('should call getTeamNumber from GameModeService', () => {
        const playerId = 'test-player';
        const expectedTeamNumber = 1;
        mockGameModeService.getTeamNumber.and.returnValue(expectedTeamNumber);

        const result = component.getTeamNumber(playerId);

        expect(mockGameModeService.getTeamNumber).toHaveBeenCalledWith(playerId);
        expect(result).toBe(expectedTeamNumber);
    });

    it('should call isPartOfOwnTeam from GameModeService', () => {
        const playerId = 'test-player';
        const expectedResult = true;
        mockGameModeService.isPartOfOwnTeam.and.returnValue(expectedResult);

        const result = component.isPartOfOwnTeam(playerId);

        expect(mockGameModeService.isPartOfOwnTeam).toHaveBeenCalledWith(playerId);
        expect(result).toBe(expectedResult);
    });

    it('should return DEF for defensive virtual player type', () => {
        const player: Player = {
            id: 'virtual-player',
            name: 'Virtual Player',
            victories: 0,
            isHost: false,
            type: VirtualPlayerTypes.Defensive,
        };

        const result = component.virtualPlayerType(player);

        expect(result).toBe('DEF');
    });

    it('should return AGR for aggressive virtual player type', () => {
        const player: Player = {
            id: 'virtual-player',
            name: 'Virtual Player',
            victories: 0,
            isHost: false,
            type: VirtualPlayerTypes.Aggressive,
        };

        const result = component.virtualPlayerType(player);

        expect(result).toBe('AGR');
    });

    it('should return --- for player with no type', () => {
        const player: Player = {
            id: 'regular-player',
            name: 'Regular Player',
            victories: 0,
            isHost: false,
        };

        const result = component.virtualPlayerType(player);

        expect(result).toBe('---');
    });

    it('should call isCtf from GameModeService', () => {
        const expectedResult = true;
        mockGameModeService.isCtf.and.returnValue(expectedResult);

        const result = component.isCtf();

        expect(mockGameModeService.isCtf).toHaveBeenCalled();
        expect(result).toBe(expectedResult);
    });
    it('should set flagHolderId when FlagTaken event is received', () => {
        component.ngOnInit();
        const mockPayload = {
            flagHolder: { id: 'player1', name: 'Player 1', victories: 0, isHost: false },
        } as FlagHolderPayload;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const flagTakenCallback = (mockSocketService as any).flagTakenCallback;
        flagTakenCallback(mockPayload);

        expect(component.flagHolderId).toBe('player1');
    });

    it('should clear flagHolderId when FlagDropped event is received', () => {
        component.ngOnInit();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (component as any)._flagHolderId = 'player1';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const flagDroppedCallback = (mockSocketService as any).flagDroppedCallback;
        flagDroppedCallback();
        expect(component.flagHolderId).toBeUndefined();
    });

    it('should unsubscribe from socket events on ngOnDestroy', () => {
        component.ngOnInit();
        component.ngOnDestroy();

        expect(mockSocketService.off).toHaveBeenCalledWith(CTFEvents.FlagTaken);
        expect(mockSocketService.off).toHaveBeenCalledWith(CTFEvents.FlagDropped);
    });
    it('should unsubscribe from socket events on ngOnDestroy', () => {
        component.ngOnInit();
        component.ngOnDestroy();

        expect(mockSocketService.off).toHaveBeenCalledWith(CTFEvents.FlagTaken);
        expect(mockSocketService.off).toHaveBeenCalledWith(CTFEvents.FlagDropped);
    });
});
