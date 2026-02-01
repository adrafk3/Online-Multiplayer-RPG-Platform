import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ActiveGamePageComponent } from './active-game-page.component';
import { ActiveGridService } from '@app/services/active-grid/active-grid.service';
import { GameOverService } from '@app/services/game-over/game-over-service';
import { PlayerService } from '@app/services/player/player.service';
import { TurnService } from '@app/services/turn/turn-service';
import { POPUP_LENGTH } from '@common/constants';
import { Actions } from '@common/enums';
import { BehaviorSubject, of } from 'rxjs';
import { EventEmitter, NO_ERRORS_SCHEMA } from '@angular/core';
import { GAME_DATA, MOCK_PLAYERS } from '@common/constants.spec';
import { Grid, Player } from '@common/interfaces';
import { ActiveGameEvents } from '@common/gateway-events';
import { VsPopUpComponent } from '@app/components/vs-pop-up/vs-pop-up.component';
import { provideHttpClient } from '@angular/common/http';
import { MockComponent, MockProvider } from 'ng-mocks';
import { TimerComponent } from '@app/components/timer/timer.component';
import { PlayerPanelComponent } from '@app/components/player-panel/player-panel.component';
import { PlayerListComponent } from '@app/components/player-list/player-list.component';
import { GameInfoComponent } from '@app/components/game-info/game-info.component';
import { ActiveGridComponent } from '@app/components/active-grid/active-grid.component';
import { TimeService } from '@app/services/time/time.service';
import { PlayerMovementService } from '@app/services/player-mouvement/player-movement.service';
import { DebugService } from '@app/services/debug-service/debug-service.service';
import { ActionService } from '@app/services/action/action.service';
import { InventoryPopUpComponent } from '@app/components/inventory-popup/inventory-popup.component';

describe('ActiveGamePageComponent', () => {
    let component: ActiveGamePageComponent;
    let fixture: ComponentFixture<ActiveGamePageComponent>;

    let mockActionService: jasmine.SpyObj<ActionService>;
    let mockTurnService: jasmine.SpyObj<TurnService>;
    let mockGameOverService: jasmine.SpyObj<GameOverService>;
    let mockPlayerService: jasmine.SpyObj<PlayerService>;
    let mockActiveGridService: jasmine.SpyObj<ActiveGridService>;

    const currentTurnSubject = new BehaviorSubject<Player | undefined>(MOCK_PLAYERS[0]);
    const blockPlayingSubject = new BehaviorSubject<boolean>(false);
    const gameOverStatusSubject = new BehaviorSubject<ActiveGameEvents | undefined>(ActiveGameEvents.CombatStarted);
    const winnerSubject = new BehaviorSubject<Player | undefined>(MOCK_PLAYERS[0]);
    const onCombatStartSubject = new BehaviorSubject<void>(undefined);
    const onCombatEndedSubject = new BehaviorSubject<void>(undefined);
    const hasActionLeftSubject = new BehaviorSubject<boolean>(false);
    const gridSubject = new BehaviorSubject<Grid>(GAME_DATA as Grid);

    beforeEach(async () => {
        mockActionService = jasmine.createSpyObj(
            'ActionService',
            ['sendCombatAction', 'init', 'disableListeners', 'getAdjacentPlayerOrDoor', 'startTrackingGrid', 'stopTrackingGrid'],
            {
                hasActionsLeftSubject: hasActionLeftSubject.asObservable(),
                onCombatStart: onCombatStartSubject.asObservable(),
                onCombatEnded: onCombatEndedSubject.asObservable(),
                hasActionLeftSubject,
                hasActionLeft: true,
                escapeAttemptsUpdated: new EventEmitter<{ playerId: string }>(),
                diceRoll: new EventEmitter<{ defenseRoll: number; attackRoll: number; attackingPlayerId: string; defendingPlayerId: string }>(),
            },
        );

        mockTurnService = jasmine.createSpyObj('TurnService', ['getCurrentTurn', 'isMyTurn', 'nextTurn', 'getPlayer', 'ngOnDestroy'], {
            blockPlaying: blockPlayingSubject.asObservable(),
            playerLastPosition: { x: 0, y: 0 },
        });
        mockTurnService.getCurrentTurn.and.returnValue(currentTurnSubject.asObservable());
        mockTurnService.isMyTurn.and.returnValue(true);

        mockGameOverService = jasmine.createSpyObj('GameOverService', [
            'getGameOverStatus',
            'getWinner',
            'handleGameOver',
            'init',
            'turnOffListeners',
            'cleanup',
        ]);
        mockGameOverService.getGameOverStatus.and.returnValue(gameOverStatusSubject.asObservable());
        mockGameOverService.getWinner.and.returnValue(winnerSubject.asObservable());

        mockPlayerService = jasmine.createSpyObj('PlayerService', ['quitGame', 'getPlayers'], {
            roomId: 'room1',
            player: MOCK_PLAYERS[0],
        });
        mockPlayerService.getPlayers.and.returnValue(of(MOCK_PLAYERS));

        mockActiveGridService = jasmine.createSpyObj(
            'ActiveGridService',
            ['isCTF', 'ngOnDestroy', 'loadGrid', 'deselectPlayer', 'findAndSelectPlayer'],
            {
                isMoving: false,
                gridSubject,
            },
        );

        await TestBed.configureTestingModule({
            imports: [
                ActiveGamePageComponent,
                MockComponent(VsPopUpComponent),
                MockComponent(ActiveGridComponent),
                MockComponent(TimerComponent),
                MockComponent(PlayerPanelComponent),
                MockComponent(PlayerListComponent),
                MockComponent(GameInfoComponent),
                MockComponent(InventoryPopUpComponent),
            ],
            providers: [
                provideHttpClient(),
                { provide: ActionService, useValue: mockActionService },
                { provide: TurnService, useValue: mockTurnService },
                { provide: GameOverService, useValue: mockGameOverService },
                { provide: PlayerService, useValue: mockPlayerService },
                { provide: ActiveGridService, useValue: mockActiveGridService },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();

        TestBed.overrideProvider(ActionService, { useValue: mockActionService });
        TestBed.overrideProvider(TurnService, { useValue: mockTurnService });
        TestBed.overrideProvider(GameOverService, { useValue: mockGameOverService });
        TestBed.overrideProvider(PlayerService, { useValue: mockPlayerService });
        TestBed.overrideProvider(ActiveGridService, { useValue: mockActiveGridService });
        TestBed.overrideProvider(TimeService, { useValue: MockProvider(TimeService) });
        TestBed.overrideProvider(PlayerMovementService, { useValue: MockProvider(PlayerMovementService) });
        TestBed.overrideProvider(DebugService, { useValue: MockProvider(DebugService) });

        fixture = TestBed.createComponent(ActiveGamePageComponent);
        component = fixture.componentInstance;

        const mockVsPopUp = jasmine.createSpyObj('VsPopUpComponent', ['initiateFight', 'endFight']);
        component['vsPopUpComponent'] = mockVsPopUp as VsPopUpComponent;

        fixture.detectChanges();
    });

    afterEach(() => {
        currentTurnSubject.complete();
        blockPlayingSubject.complete();
        gameOverStatusSubject.complete();
        winnerSubject.complete();
        onCombatStartSubject.complete();
        onCombatEndedSubject.complete();
        hasActionLeftSubject.complete();
        gridSubject.complete();

        fixture.destroy();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should prevent context menu', () => {
        const event = new MouseEvent('contextmenu');
        const preventDefaultSpy = spyOn(event, 'preventDefault');
        component.onContextMenu(event);
        expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should toggle action state and update grid selection', () => {
        mockActionService.isActionClicked = false;
        component.isAction();
        expect(mockActiveGridService.deselectPlayer).toHaveBeenCalled();
        component.isAction();
        expect(mockActiveGridService.findAndSelectPlayer).toHaveBeenCalled();
    });

    it('should return hasActionLeft value', () => {
        Object.defineProperty(mockActionService, 'hasActionLeft', {
            get: () => true,
        });
        expect(component.hasActionLeft()).toBeTrue();
    });

    it('should call getAdjacentPlayerOrDoor', () => {
        mockActionService.getAdjacentPlayerOrDoor.and.returnValue(true);
        const result = component.getAdjacentPlayerOrDoor();
        expect(mockActionService.getAdjacentPlayerOrDoor).toHaveBeenCalled();
        expect(result).toEqual(true);
    });

    it('should send escape action', () => {
        component.escapeAction();
        expect(mockActionService.sendCombatAction).toHaveBeenCalledWith('room1', MOCK_PLAYERS[0], Actions.Escape);
    });

    it('should send attack action', () => {
        component.attackAction();
        expect(mockActionService.sendCombatAction).toHaveBeenCalledWith('room1', MOCK_PLAYERS[0], Actions.Attack);
    });

    it('should call playerService.quitGame when quitGame is called', () => {
        component.quitGame();
        expect(mockPlayerService.quitGame).toHaveBeenCalled();
    });

    it('should call nextTurn correctly', () => {
        component.nextTurn();
        expect(hasActionLeftSubject.value).toBeTrue();
        expect(mockTurnService.nextTurn).toHaveBeenCalled();
    });

    it('should show turn popup temporarily', fakeAsync(() => {
        component['showTurnPopup']();
        expect(component.isTurnPopupVisible).toBeTrue();

        tick(POPUP_LENGTH);
        expect(component.isTurnPopupVisible).toBeFalse();
    }));

    it('should not reset speed when position is undefined', () => {
        const originalGrid = gridSubject.getValue();
        component['resetSpeed'](undefined);
        expect(gridSubject.getValue()).toBe(originalGrid);
    });

    it('should return isTurnPopupVisible', () => {
        component['_isTurnPopupVisible'] = true;
        expect(component.isTurnPopupVisible).toBeTrue();
    });

    it('should return isMyTurn', () => {
        component['_isMyTurn'] = true;
        expect(component.isMyTurn).toBeTrue();
    });

    it('should return isMoving from activeGridService', () => {
        Object.defineProperty(mockActiveGridService, 'isMoving', {
            get: () => false,
        });
        expect(component.isMoving).toBeFalse();
    });

    it('should return isCombatStarted', () => {
        component['_isCombatStarted'] = true;
        expect(component.isCombatStarted).toBeTrue();
    });

    it('should reset player speed', () => {
        mockActiveGridService.gridSubject.next(GAME_DATA as Grid);
        const grid = mockActiveGridService.gridSubject.value;
        if (grid) {
            grid.board[0][0].player = MOCK_PLAYERS[0];
            mockActiveGridService.gridSubject.next(grid);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (component as any).resetSpeed({ x: 0, y: 0 });
            const player = mockActiveGridService.gridSubject.value?.board[0][0].player?.stats;
            if (player && player.maxSpeed) expect(player.speed).toEqual(player.maxSpeed);
        }
    });
});
