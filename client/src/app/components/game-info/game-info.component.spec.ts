import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameInfoComponent } from './game-info.component';
import { TurnService } from '@app/services/turn/turn-service';
import { PlayerService } from '@app/services/player/player.service';
import { SocketService } from '@app/services/socket/socket.service';
import { ActiveGridService } from '@app/services/active-grid/active-grid.service';
import { BehaviorSubject, of } from 'rxjs';
import { Grid, Player } from '@common/interfaces';
import { GAME_DATA, MOCK_PLAYERS } from '@common/constants.spec';
import { ActiveGameEvents } from '@common/gateway-events';

describe('GameInfoComponent', () => {
    let component: GameInfoComponent;
    let fixture: ComponentFixture<GameInfoComponent>;
    let mockTurnService: jasmine.SpyObj<TurnService>;
    let mockPlayerService: jasmine.SpyObj<PlayerService>;
    let mockSocketService: jasmine.SpyObj<SocketService>;
    let mockActiveGridService: jasmine.SpyObj<ActiveGridService>;

    let mockGridSubject: BehaviorSubject<Grid>;
    let mockPlayersSubject: BehaviorSubject<Player[]>;
    let mockCurrentTurnSubject: BehaviorSubject<Player>;

    beforeEach(async () => {
        mockGridSubject = new BehaviorSubject<Grid>(GAME_DATA as Grid);
        mockPlayersSubject = new BehaviorSubject<Player[]>(MOCK_PLAYERS);
        mockCurrentTurnSubject = new BehaviorSubject<Player>(MOCK_PLAYERS[0]);

        mockTurnService = jasmine.createSpyObj('TurnService', ['getCurrentTurn']);
        mockPlayerService = jasmine.createSpyObj('PlayerService', ['getPlayers']);
        mockSocketService = jasmine.createSpyObj('SocketService', ['on', 'off', 'isConnected']);
        mockActiveGridService = jasmine.createSpyObj('ActiveGridService', [], {
            gridSubject: mockGridSubject,
        });
        mockTurnService.getCurrentTurn.and.returnValue(of(MOCK_PLAYERS[0]));
        mockPlayerService.getPlayers.and.returnValue(of(MOCK_PLAYERS));
        mockSocketService.isConnected.and.returnValue(of(true));
        await TestBed.configureTestingModule({
            providers: [
                { provide: TurnService, useValue: mockTurnService },
                { provide: PlayerService, useValue: mockPlayerService },
                { provide: SocketService, useValue: mockSocketService },
                { provide: ActiveGridService, useValue: mockActiveGridService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameInfoComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    const triggerPlayerDisconnect = (quittingPlayerId: string) => {
        const handler = mockSocketService.on.calls.allArgs().find((args) => args[0] === ActiveGameEvents.PlayerDisconnect)?.[1];
        if (handler) handler({ playerId: quittingPlayerId });
    };
    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize and subscribe to grid changes', () => {
        const mockGrid: Grid = GAME_DATA as Grid;
        mockGridSubject.next(mockGrid);

        expect(component.grid).toEqual(mockGrid);
    });

    it('should update the number of players when players change', () => {
        mockPlayersSubject.next(MOCK_PLAYERS);

        expect(component.numberOfPlayers).toBe(MOCK_PLAYERS.length);
    });

    it('should update the player name turn when turn changes', () => {
        mockCurrentTurnSubject.next(MOCK_PLAYERS[0]);

        expect(component.playerNameTurn).toBe(MOCK_PLAYERS[0].name);
    });

    it('should decrease the number of players on player disconnect', () => {
        mockPlayersSubject.next(MOCK_PLAYERS);
        expect(component.numberOfPlayers).toBe(MOCK_PLAYERS.length);

        triggerPlayerDisconnect('1');

        expect(component.numberOfPlayers).toBe(MOCK_PLAYERS.length - 1);
    });
});
