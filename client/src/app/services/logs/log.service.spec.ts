import { TestBed } from '@angular/core/testing';
import { PlayerService } from '@app/services/player/player.service';
import { SocketService } from '@app/services/socket/socket.service';
import { MOCK_PLAYERS, MOCK_ROOM } from '@common/constants.spec';
import { CombatResults, ItemId } from '@common/enums';
import { ActiveGameEvents, CTFEvents, DebugEvents } from '@common/gateway-events';
import { CombatUpdate, DebugResponse, FlagHolderPayload, GameDisconnect, ItemUpdate, Player, ToggleDoor, TurnUpdate } from '@common/interfaces';
import { BehaviorSubject, Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { LogService } from './log.service';

describe('LogService', () => {
    let service: LogService;
    let mockSocketService: jasmine.SpyObj<SocketService>;
    let mockPlayerService: jasmine.SpyObj<PlayerService>;
    const mockPlayer1: Player = MOCK_PLAYERS[0];
    const mockPlayer2: Player = MOCK_PLAYERS[1];
    const mockPlayers = [mockPlayer1, mockPlayer2];
    const mockCombatUpdate = (message: CombatResults, attackerId: string, defenderId: string) => ({
        message,
        gameState: {
            players: mockPlayers,
            combat: {
                attacker: attackerId,
                defender: defenderId,
                turn: 'player1',
                initialStats: {
                    attacker: {
                        life: 1,
                        speed: 1,
                        attack: 1,
                        defense: 1,
                    },
                    defender: {
                        life: 1,
                        speed: 1,
                        attack: 1,
                        defense: 1,
                    },
                },
            },
        },
        damage: 1,
        roomId: 'room1',
        diceAttack: 5,
        diceDefense: 3,
        finalDice: {
            attack: 3,
            defense: 4,
        },
    });
    beforeEach(() => {
        mockSocketService = jasmine.createSpyObj('SocketService', ['on', 'off']);
        mockPlayerService = jasmine.createSpyObj('PlayerService', ['getPlayers'], {
            player: mockPlayer1,
        });
        const playersSubject = new BehaviorSubject<Player[]>(mockPlayers);
        mockPlayerService.getPlayers.and.returnValue(playersSubject.asObservable().pipe(take(1)));
        TestBed.configureTestingModule({
            providers: [LogService, { provide: SocketService, useValue: mockSocketService }, { provide: PlayerService, useValue: mockPlayerService }],
        });
        service = TestBed.inject(LogService);
        service.setupListeners();
    });
    it('should be created', () => {
        expect(service).toBeTruthy();
    });
    describe('logs', () => {
        it('should return logs as observable', () => {
            const logs$ = service.logs;
            expect(logs$).toBeInstanceOf(Observable);
        });
    });
    describe('filterLogs', () => {
        beforeEach(() => {
            const log1 = service['createNewLog']('Message 1', mockPlayer1);
            const log2 = service['createNewLog']('Message 2', mockPlayer2);
            const log3 = service['createNewLog']('Message 3', undefined, mockPlayer1);
            service['_allLogs'] = [log1, log2, log3];
            service['_logs'].next([log1, log2, log3]);
        });
        it('should filter logs to show only those related to current player', () => {
            service.filterLogs();

            service.logs.subscribe((logs) => {
                expect(logs.length).toBe(2);
                expect(logs.some((l) => l.message?.player?.id === mockPlayer1.id)).toBeTrue();
                expect(logs.some((l) => l.defendingPlayer?.id === mockPlayer1.id)).toBeTrue();
            });
            expect(service['_areLogsFiltered']).toBeTrue();
        });
        it('should unfilter logs when called again', () => {
            service.filterLogs();
            service.filterLogs();

            service.logs.subscribe((logs) => {
                // eslint-disable-next-line @typescript-eslint/no-magic-numbers
                expect(logs.length).toBe(3);
            });
            expect(service['_areLogsFiltered']).toBeFalse();
        });
        it('should do nothing if no player is set', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockPlayerService.player = undefined as any;
            service.filterLogs();
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            service.logs.subscribe((logs) => {
                expect(logs.length).toBe(2);
            });
        });
    });
    describe('setupListeners', () => {
        it('should set up all socket listeners', () => {
            expect(mockSocketService.on).toHaveBeenCalledWith(ActiveGameEvents.CombatUpdate, jasmine.any(Function));
            expect(mockSocketService.on).toHaveBeenCalledWith(ActiveGameEvents.TurnUpdate, jasmine.any(Function));
            expect(mockSocketService.on).toHaveBeenCalledWith(ActiveGameEvents.PlayerDisconnect, jasmine.any(Function));
            expect(mockSocketService.on).toHaveBeenCalledWith(ActiveGameEvents.DoorUpdate, jasmine.any(Function));
            expect(mockSocketService.on).toHaveBeenCalledWith(DebugEvents.ToggleDebug, jasmine.any(Function));
            expect(mockSocketService.on).toHaveBeenCalledWith(CTFEvents.FlagTaken, jasmine.any(Function));
        });
    });
    describe('handleCombatUpdate', () => {
        it('should return if combat has ended', () => {
            const update = mockCombatUpdate(CombatResults.AttackDefeated, mockPlayer1.id, mockPlayer2.id);
            const result = service['handleCombatUpdate'](update);
            expect(result).toBe(undefined);
        });
        it("should return if players don't exist", () => {
            const update = mockCombatUpdate(CombatResults.AttackDefeated, '1', '2');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            update.gameState.players = undefined as any;
            const result = service['handleCombatUpdate'](update);
            expect(result).toBe(undefined);
        });
        it('should handle AttackDefeated with winner announcement', () => {
            const update = mockCombatUpdate(CombatResults.AttackDefeated, mockPlayer1.id, mockPlayer2.id);
            service['handleCombatUpdate'](update);
            service.logs.subscribe((logs) => {
                expect(logs.some((l) => l.message?.message.includes('a gagné'))).toBeTrue();
            });
        });
        it('should handle AttackNotDefeated with attack log', () => {
            const update = mockCombatUpdate(CombatResults.AttackNotDefeated, mockPlayer1.id, mockPlayer2.id);
            service['handleCombatUpdate'](update);

            service.logs.subscribe((logs) => {
                expect(logs.some((l) => l.message?.message.includes('a attaqué'))).toBeTrue();
                expect(logs.some((l) => l.message.message.includes(`${update.finalDice.attack}`)));
                expect(logs.some((l) => l.message.message.includes(`${update.finalDice.defense}`)));
            });

            const newUpdate = { ...update, finalDice: undefined };
            service['handleCombatUpdate'](newUpdate);
            service.logs.subscribe((logs) => {
                expect(logs.some((l) => l.message.message.includes(`${update.diceAttack}`)));
                expect(logs.some((l) => l.message.message.includes(`${update.diceDefense}`)));
            });
        });

        it('should handle EscapeSucceeded with escape logs', () => {
            const update = mockCombatUpdate(CombatResults.EscapeSucceeded, mockPlayer1.id, mockPlayer2.id);
            service['handleCombatUpdate'](update);

            service.logs.subscribe((logs) => {
                expect(logs.some((l) => l.message?.message.includes('tente de fuir'))).toBeTrue();
                expect(logs.some((l) => l.message?.message.includes('a fui'))).toBeTrue();
            });
            update.gameState.combat.attacker = mockPlayer2.id;
            update.gameState.combat.defender = MOCK_PLAYERS[2].id;
            update.gameState.players = [mockPlayer2, MOCK_PLAYERS[2]];
            const result = service['handleCombatUpdate'](update);
            expect(result).toBe(undefined);
        });

        it('should handle EscapeFailed with escape logs', () => {
            const update = mockCombatUpdate(CombatResults.EscapeFailed, mockPlayer1.id, mockPlayer2.id);
            service['handleCombatUpdate'](update);

            service.logs.subscribe((logs) => {
                expect(logs.some((l) => l.message?.message.includes('tente de fuir'))).toBeTrue();
                expect(logs.some((l) => l.message?.message.includes('pas pu fuir'))).toBeTrue();
            });
            update.gameState.combat.attacker = mockPlayer2.id;
            update.gameState.combat.defender = MOCK_PLAYERS[2].id;
            update.gameState.players = [mockPlayer2, MOCK_PLAYERS[2]];
            const result = service['handleCombatUpdate'](update);
            expect(result).toBe(undefined);
        });

        it('should not add logs for combat updates not involving current player', () => {
            const update = mockCombatUpdate(CombatResults.AttackNotDefeated, mockPlayer2.id, MOCK_PLAYERS[2].id);
            update.gameState.players = [mockPlayer2, MOCK_PLAYERS[2]];
            service['handleCombatUpdate'](update);

            service.logs.subscribe((logs) => {
                expect(logs.length).toBe(0);
            });
        });
    });

    describe('socket event handlers', () => {
        it('should handle CombatInitiated event', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const combatInitiatedSpy = spyOn(service as any, 'addLog').and.callThrough();
            const combatInitiatedHandler = mockSocketService.on.calls.argsFor(0)[1] as (data: CombatUpdate) => void;
            const combatUpdate = mockCombatUpdate(CombatResults.AttackDefeated, mockPlayer1.id, mockPlayer2.id);
            combatInitiatedHandler(combatUpdate);
            expect(combatInitiatedSpy).toHaveBeenCalledWith(
                service['createNewLog'](
                    `Combat initié par ${combatUpdate.gameState?.players[0].name} avec ${combatUpdate.gameState?.players[1].name}.`,
                ),
            );
        });

        it('should handle CombatUpdate event and process different combat outcomes', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const handleCombatUpdateSpy = spyOn(service as any, 'handleCombatUpdate').and.callThrough();
            const combatUpdateHandler = mockSocketService.on.calls.argsFor(1)[1] as (data: CombatUpdate) => void;
            const combatUpdate = mockCombatUpdate(CombatResults.AttackDefeated, mockPlayer1.id, mockPlayer2.id);
            combatUpdateHandler(combatUpdate);

            expect(handleCombatUpdateSpy).toHaveBeenCalledWith(combatUpdate);
        });
        it('should handle ItemPickedUp event', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const itemPickedUpSpy = spyOn(service as any, 'addLog').and.callThrough();
            const itemPickedUpHandler = mockSocketService.on.calls.argsFor(2)[1] as (data: ItemUpdate) => void;
            const itemPickedUp = {
                playerId: MOCK_PLAYERS[0].id,
                item: MOCK_ROOM.map?.board[0][0].item,
            } as ItemUpdate;
            itemPickedUpHandler(itemPickedUp);
            expect(itemPickedUpSpy).toHaveBeenCalled();
            itemPickedUpSpy.calls.reset();
            if (itemPickedUp.item) itemPickedUp.item.id = ItemId.ItemFlag;
            itemPickedUpHandler(itemPickedUp);
            expect(itemPickedUpSpy).not.toHaveBeenCalled();
        });
        it('should handle TurnUpdate event', () => {
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            const turnUpdateHandler = mockSocketService.on.calls.argsFor(3)[1] as (data: TurnUpdate) => void;
            const turnUpdate: TurnUpdate = { player: mockPlayer1 };

            turnUpdateHandler(turnUpdate);

            service.logs.subscribe((logs) => {
                expect(logs.some((l) => l.message?.message.includes('tour de'))).toBeTrue();
            });
        });

        it('should handle PlayerDisconnect event', () => {
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            const disconnectHandler = mockSocketService.on.calls.argsFor(4)[1] as (data: GameDisconnect) => void;
            const disconnect: GameDisconnect = {
                playerId: mockPlayer1.id,
                remainingPlayers: [mockPlayer2],
            };
            disconnectHandler(disconnect);
            service.logs.subscribe((logs) => {
                expect(logs.some((l) => l.message?.message.includes('déconnecté'))).toBeTrue();
            });
            expect(service['_remainingPlayers'].value).toEqual([mockPlayer2]);
        });

        it('should handle DoorUpdate event', () => {
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            const doorHandler = mockSocketService.on.calls.argsFor(5)[1] as (data: ToggleDoor) => void;
            const doorUpdate: ToggleDoor = {
                isOpened: true,
                player: mockPlayer1,
                position: { x: 0, y: 0 },
            };
            doorHandler(doorUpdate);
            service.logs.subscribe((logs) => {
                expect(logs.some((l) => l.message?.message.includes('ouverte'))).toBeTrue();
            });

            doorUpdate.isOpened = false;
            doorHandler(doorUpdate);
            service.logs.subscribe((logs) => {
                expect(logs.some((l) => l.message?.message.includes('fermée'))).toBeTrue();
            });
        });
        it('should handle ToggleDebug event', () => {
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            const debugHandler = mockSocketService.on.calls.argsFor(6)[1] as (data: DebugResponse) => void;
            const debugResponse: DebugResponse = {
                isDebug: true,
            };
            debugHandler(debugResponse);
            service.logs.subscribe((logs) => {
                expect(logs.some((l) => l.message?.message.includes('activé'))).toBeTrue();
            });
            debugResponse.isDebug = false;
            debugHandler(debugResponse);
            service.logs.subscribe((logs) => {
                expect(logs.some((l) => l.message?.message.includes('désactivé'))).toBeTrue();
            });
        });
        it('should handle FlagTaken event', () => {
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            const flagHandler = mockSocketService.on.calls.argsFor(7)[1] as (data: FlagHolderPayload) => void;
            const flagData: FlagHolderPayload = {
                flagHolder: mockPlayer2,
            };
            flagHandler(flagData);

            service.logs.subscribe((logs) => {
                expect(logs.some((l) => l.message?.message.includes('a pris le drapeau'))).toBeTrue();
            });
        });
        it('should handle FlagCaptured event', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const endGameLogSpy = spyOn(service as any, 'endGameLog').and.callThrough();
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            const flagHandler = mockSocketService.on.calls.argsFor(8)[1] as () => void;
            flagHandler();
            expect(endGameLogSpy).toHaveBeenCalled();
        });
    });
    describe('createNewLog', () => {
        it('should create a log with message and player', () => {
            const log = service['createNewLog']('Test message', mockPlayer1);

            expect(log.message?.message).toBe('Test message');
            expect(log.message?.player).toBe(mockPlayer1);
            expect(log.message?.time).toBeDefined();
        });

        it('should create a log with defending player', () => {
            const log = service['createNewLog']('Test message', mockPlayer1, mockPlayer2);

            expect(log.defendingPlayer).toBe(mockPlayer2);
        });

        it('should create a log without players', () => {
            const log = service['createNewLog']('Test message');

            expect(log.message?.player).toBeUndefined();
            expect(log.defendingPlayer).toBeUndefined();
        });
    });
    describe('ngOnDestroy', () => {
        it('should remove all socket listeners', () => {
            service.ngOnDestroy();
            expect(mockSocketService.off).toHaveBeenCalledWith(ActiveGameEvents.CombatUpdate);
            expect(mockSocketService.off).toHaveBeenCalledWith(ActiveGameEvents.NextTurn);
            expect(mockSocketService.off).toHaveBeenCalledWith(ActiveGameEvents.PlayerDisconnect);
            expect(mockSocketService.off).toHaveBeenCalledWith(ActiveGameEvents.CombatInitiated);
            expect(mockSocketService.off).toHaveBeenCalledWith(ActiveGameEvents.DoorUpdate);
        });
    });
});
