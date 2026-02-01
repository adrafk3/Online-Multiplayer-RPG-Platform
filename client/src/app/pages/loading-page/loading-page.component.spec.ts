import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { PlayerCardComponent } from '@app/components/player-card/player-card.component';
import { AlertService } from '@app/services/alert/alert.service';
import { GameModeService } from '@app/services/game-mode/game-mode.service';
import { PlayerService } from '@app/services/player/player.service';
import { SocketService } from '@app/services/socket/socket.service';
import { MAX_N_COLUMNS } from '@common/constants';
import { MAX_PLAYERS_2, MAX_PLAYERS_4 } from '@common/constants.spec';
import { GameModes, Players, VirtualPlayerTypes } from '@common/enums';
import { GameRoomEvents } from '@common/gateway-events';
import { LockResponse, Player, RoomData } from '@common/interfaces';
import { LoadingPageComponent } from './loading-page.component';

describe('LoadingPageComponent', () => {
    let component: LoadingPageComponent;
    let fixture: ComponentFixture<LoadingPageComponent>;
    let mockPlayerService: jasmine.SpyObj<PlayerService>;
    let mockSocketService: jasmine.SpyObj<SocketService>;
    let mockAlertService: jasmine.SpyObj<AlertService>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockGameModeService: jasmine.SpyObj<GameModeService>;

    beforeEach(async () => {
        mockPlayerService = jasmine.createSpyObj(
            'PlayerService',
            ['startGame', 'updateRoom', 'toggleLock', 'quitGame', 'addVirtualPlayer', 'kickPlayer'],
            {
                player: { isHost: true },
                roomId: '1234',
            },
        );
        mockGameModeService = jasmine.createSpyObj('GameModeService', ['canStartGame']);
        mockSocketService = jasmine.createSpyObj('SocketService', ['on', 'disconnect', 'off']);
        mockAlertService = jasmine.createSpyObj('AlertService', ['alert']);
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);
        mockRouter.navigate.and.returnValue(Promise.resolve(true));
        await TestBed.configureTestingModule({
            imports: [PlayerCardComponent, LoadingPageComponent],
            providers: [
                { provide: PlayerService, useValue: mockPlayerService },
                { provide: SocketService, useValue: mockSocketService },
                { provide: Router, useValue: mockRouter },
                { provide: AlertService, useValue: mockAlertService },
                { provide: GameModeService, useValue: mockGameModeService },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(LoadingPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    describe('gridColumns', () => {
        it('should return repeat(2, 1fr) for MediumMap with more than 2 players', () => {
            component.maxPlayers = Players.MediumMap;
            component.players = [{}, {}, {}] as Player[];
            expect(component.gridColumns).toBe(`repeat(${MAX_N_COLUMNS - 1}, 1fr)`);
        });

        it('should return repeat(n, 1fr) when players <= MAX_N_COLUMNS', () => {
            component.maxPlayers = Players.BigMap;
            component.players = [{}, {}] as Player[];
            expect(component.gridColumns).toBe('repeat(2, 1fr)');
        });

        it('should return repeat(MAX_N_COLUMNS, 1fr) when players > MAX_N_COLUMNS and not MediumMap', () => {
            component.maxPlayers = Players.BigMap;
            component.players = [{}, {}, {}, {}] as Player[];
            expect(component.gridColumns).toBe(`repeat(${MAX_N_COLUMNS}, 1fr)`);
        });

        it('should handle empty players array', () => {
            component.maxPlayers = Players.MediumMap;
            component.players = [];
            expect(component.gridColumns).toBe('repeat(0, 1fr)');
        });

        it('should handle exactly MAX_N_COLUMNS-1 players for MediumMap', () => {
            component.maxPlayers = Players.MediumMap;
            component.players = new Array(MAX_N_COLUMNS - 1).fill({}) as Player[];
            expect(component.gridColumns).toBe(`repeat(${MAX_N_COLUMNS - 1}, 1fr)`);
        });
    });

    it('should toggle lock state on calling onLock()', () => {
        component.isLocked = false;
        component.onLock();
        expect(mockPlayerService.toggleLock).toHaveBeenCalled();
    });

    it('should navigate to home and disconnect if roomId is empty on ngOnInit', fakeAsync(() => {
        Object.defineProperty(mockPlayerService, 'roomId', { get: () => '' });
        component.ngOnInit();
        tick();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
        expect(mockAlertService.alert).toHaveBeenCalled();
    }));

    it('should play an audio if player avatar is Knuckles', () => {
        mockPlayerService.player.avatar = 'Knuckles';
        const playSpy = spyOn(Audio.prototype, 'play');

        component.ngOnInit();

        expect(playSpy).toHaveBeenCalled();
    });

    it('should update isLocked and call checkLoadingState() when toggleLock event is received', () => {
        const lockResponse: LockResponse = { isLocked: true };
        spyOn(component, 'checkLoadingState');

        mockSocketService.on.calls.all().forEach((call) => {
            if (call.args[0] === 'toggleLock') {
                call.args[1](lockResponse);
            }
        });

        expect(component.isLocked).toBeTrue();
        expect(component.checkLoadingState).toHaveBeenCalled();
    });

    it('should update isLoading state correctly', () => {
        component.players = [{ id: '1' }] as Player[];
        component.maxPlayers = MAX_PLAYERS_4;
        component.isLocked = false;
        component.checkLoadingState();
        expect(component.isLoading).toBeTrue();

        component.isLocked = true;
        component.checkLoadingState();
        expect(component.isLoading).toBeFalse();
    });

    it('should update players list when kicking a player', () => {
        component.players = [{ id: '1' }, { id: '2' }] as Player[];
        component.onKick({ id: '1' } as Player);
        expect(mockPlayerService.kickPlayer).toHaveBeenCalledWith('1');
    });

    it('should listen to room updates and apply changes', () => {
        const roomData: RoomData = {
            mapId: 'test-map',
            playerMax: MAX_PLAYERS_4,
            playerMin: MAX_PLAYERS_2,
            players: [
                { id: '1', name: 'Simon' },
                { id: '2', name: 'Nicolas' },
            ] as Player[],
            selectedAvatars: new Map<string, string>([
                ['player1', 'Archer'],
                ['player2', 'Cubic'],
            ]),
            isLocked: true,
        };

        mockSocketService.on.and.callFake((event, callback) => {
            if (event === 'roomUpdateResponse') (callback as (data: RoomData) => void)(roomData);
        });

        mockSocketService.on.calls.allArgs().forEach(([event, callback]) => {
            if (event === 'roomUpdateResponse') callback(roomData);
        });

        expect(component.players.length).toBe(MAX_PLAYERS_2);
        expect(component.maxPlayers).toBe(MAX_PLAYERS_4);
        expect(component.minPlayers).toBe(MAX_PLAYERS_2);
        expect(component.isLocked).toBeTrue();
    });

    describe('addVirtualPlayer', () => {
        it('should toggle virtual player type selection', () => {
            expect(component.isVirtualPlayerTypeVisible).toBeFalsy();
            component.addVirtualPlayer();
            expect(component.isVirtualPlayerTypeVisible).toBeTruthy();
            component.addVirtualPlayer();
            expect(component.isVirtualPlayerTypeVisible).toBeFalsy();
        });

        it('should add a virtual player when choosing type', () => {
            component.players = [];
            component.maxPlayers = MAX_PLAYERS_4;
            component.onChooseVirtualPlayerType(VirtualPlayerTypes.Aggressive as VirtualPlayerTypes);
            expect(mockPlayerService.addVirtualPlayer).toHaveBeenCalledWith(VirtualPlayerTypes.Aggressive);
        });

        it('should call stopPropagation when event is provided', () => {
            const mockEvent = {
                stopPropagation: jasmine.createSpy(),
            } as unknown as MouseEvent;

            component.addVirtualPlayer(mockEvent);

            expect(mockEvent.stopPropagation).toHaveBeenCalled();
        });

        it('should not throw when no event is provided', () => {
            expect(() => component.addVirtualPlayer()).not.toThrow();
        });

        it('should toggle visibility with event provided', () => {
            const mockEvent = {
                stopPropagation: jasmine.createSpy(),
            } as unknown as MouseEvent;

            component.isVirtualPlayerTypeVisible = false;
            component.addVirtualPlayer(mockEvent);
            expect(component.isVirtualPlayerTypeVisible).toBeTrue();

            component.addVirtualPlayer(mockEvent);
            expect(component.isVirtualPlayerTypeVisible).toBeFalse();
        });

        it('should toggle visibility without event provided', () => {
            component.isVirtualPlayerTypeVisible = false;
            component.addVirtualPlayer();
            expect(component.isVirtualPlayerTypeVisible).toBeTrue();

            component.addVirtualPlayer();
            expect(component.isVirtualPlayerTypeVisible).toBeFalse();
        });
    });

    it('should call playerService.quitGame() when leaveGame() is called', () => {
        component.leaveGame();
        expect(mockPlayerService.quitGame).toHaveBeenCalled();
    });
    it('should call playerService.startGame() when startGame() is called', () => {
        component.startGame();
        expect(mockPlayerService.startGame).toHaveBeenCalled();
    });
    it('should handle startGame event', fakeAsync(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (component as any)['setupRoomUpdateListener']();
        mockSocketService.on.calls.allArgs().forEach(([event, callback]) => {
            if (event === GameRoomEvents.StartGame) callback(undefined);
        });
        tick();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/game']);
    }));
    it('should update loading dots using RxJS interval', fakeAsync(() => {
        component.ngOnInit();

        expect(component.loadingDots).toBe('');

        const INTERVAL = 500;
        tick(INTERVAL);
        fixture.detectChanges();
        expect(component.loadingDots).toBe('.');

        tick(INTERVAL);
        fixture.detectChanges();
        expect(component.loadingDots).toBe('..');

        tick(INTERVAL);
        fixture.detectChanges();
        expect(component.loadingDots).toBe('...');

        tick(INTERVAL);
        fixture.detectChanges();
        expect(component.loadingDots).toBe('');
        component.ngOnDestroy();
    }));
    it('should call canStartGame from service', () => {
        component.canStartGame();
        expect(mockGameModeService.canStartGame).toHaveBeenCalled();
    });
    describe('getStartText', () => {
        it('should return empty string when game is locked with enough players', () => {
            component.isLocked = true;
            component.players = [{}, {}] as Player[];
            component.minPlayers = 2;
            component.maxPlayers = 4;
            mockGameModeService.gameMode = GameModes.Classic;

            expect(component.getStartText()).toBe('');
        });

        it('should include locked message when game is not locked', () => {
            component.isLocked = false;
            expect(component.getStartText()).toContain('vérrouiller la partie');
        });

        it('should include min players message when players < minPlayers', () => {
            component.players = [{}] as Player[];
            component.minPlayers = 2;
            expect(component.getStartText()).toContain('être un nombre pair de joueurs');
        });

        it('should include pair number message in team mode with odd players', () => {
            component.players = [{}, {}, {}] as Player[];
            component.maxPlayers = 4;
            mockGameModeService.gameMode = GameModes.CTF;
            expect(component.getStartText()).toContain('être un nombre pair de joueurs');
        });

        it('should combine multiple messages with commas', () => {
            component.isLocked = false;
            component.players = [{}] as Player[];
            component.minPlayers = 2;
            mockGameModeService.gameMode = GameModes.CTF;

            const result = component.getStartText();
            expect(result).toContain('vérrouiller la partie');
            expect(result).toContain('être au moins deux joueurs');
            expect(result).toContain('être un nombre pair de joueurs');
            expect(result.match(/,/g)?.length).toBe(2);
        });

        it('should end with a period when there are messages', () => {
            component.isLocked = false;
            expect(component.getStartText().endsWith('.')).toBe(true);
        });
    });

    describe('onDocumentClick', () => {
        let mockElement: HTMLElement;
        let mockAddPlayerButton: HTMLElement;
        let mockTypePrompt: HTMLElement;

        beforeEach(() => {
            mockElement = document.createElement('div');
            mockAddPlayerButton = document.createElement('div');
            mockAddPlayerButton.classList.add('add-player');
            mockTypePrompt = document.createElement('div');
            mockTypePrompt.classList.add('type-prompt');
        });

        function createMockEvent(target: EventTarget): MouseEvent {
            return {
                target,
                preventDefault: jasmine.createSpy(),
                stopPropagation: jasmine.createSpy(),
            } as unknown as MouseEvent;
        }

        it('should close dropdown when clicking outside', () => {
            component.isVirtualPlayerTypeVisible = true;
            const event = createMockEvent(mockElement);

            component.onDocumentClick(event);

            expect(component.isVirtualPlayerTypeVisible).toBeFalse();
        });

        it('should keep dropdown open when clicking add-player button', () => {
            component.isVirtualPlayerTypeVisible = true;
            const event = createMockEvent(mockAddPlayerButton);

            component.onDocumentClick(event);

            expect(component.isVirtualPlayerTypeVisible).toBeTrue();
        });

        it('should keep dropdown open when clicking inside type-prompt', () => {
            component.isVirtualPlayerTypeVisible = true;
            const event = createMockEvent(mockTypePrompt);

            component.onDocumentClick(event);

            expect(component.isVirtualPlayerTypeVisible).toBeTrue();
        });

        it('should handle null target gracefully', () => {
            component.isVirtualPlayerTypeVisible = true;
            const event = createMockEvent(null as unknown as EventTarget);

            component.onDocumentClick(event);

            expect(component.isVirtualPlayerTypeVisible).toBeFalse();
        });

        it('should handle non-HTML element target', () => {
            component.isVirtualPlayerTypeVisible = true;
            const textNode = document.createTextNode('text');
            const event = createMockEvent(textNode);

            component.onDocumentClick(event);

            expect(component.isVirtualPlayerTypeVisible).toBeFalse();
        });

        it('should not change state if dropdown is already closed', () => {
            component.isVirtualPlayerTypeVisible = false;
            const event = createMockEvent(mockElement);

            component.onDocumentClick(event);

            expect(component.isVirtualPlayerTypeVisible).toBeFalse();
        });

        it('should find closest parent when clicking nested elements', () => {
            component.isVirtualPlayerTypeVisible = true;
            const nestedElement = document.createElement('span');
            mockTypePrompt.appendChild(nestedElement);
            const event = createMockEvent(nestedElement);

            component.onDocumentClick(event);

            expect(component.isVirtualPlayerTypeVisible).toBeTrue();
        });
    });
});
