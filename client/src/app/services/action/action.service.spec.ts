import { TestBed } from '@angular/core/testing';
import { ActiveGridService } from '@app/services/active-grid/active-grid.service';
import { CombatService } from '@app/services/combat/combat.service';
import { PlayerService } from '@app/services/player/player.service';
import { SocketService } from '@app/services/socket/socket.service';
import { TurnService } from '@app/services/turn/turn-service';
import { GAME_DATA, MOCK_PLAYERS, MOCK_ROOM, TOGGLE_DOOR_DATA } from '@common/constants.spec';
import { Actions, TileTypes } from '@common/enums';
import { ActiveGameEvents } from '@common/gateway-events';
import { Grid, Player, ToggleDoor } from '@common/interfaces';
import { Position } from '@common/types';
import { BehaviorSubject, of, Subject, Subscription } from 'rxjs';
import { ActionService } from './action.service';

describe('ActionService', () => {
    let actionService: ActionService;
    let activeGridService: jasmine.SpyObj<ActiveGridService>;
    let playerService: jasmine.SpyObj<PlayerService>;
    let socketService: jasmine.SpyObj<SocketService>;
    let turnService: jasmine.SpyObj<TurnService>;
    let combatService: CombatService;

    let mockGrid = MOCK_ROOM.map;
    let mockGridSubject: BehaviorSubject<Grid | undefined>;
    let mockPlayer = JSON.parse(JSON.stringify(MOCK_PLAYERS[0]));
    const toggleDoorData = TOGGLE_DOOR_DATA;

    beforeEach(() => {
        mockGrid = JSON.parse(JSON.stringify(MOCK_ROOM.map));
        mockGridSubject = new BehaviorSubject<Grid | undefined>(mockGrid);
        mockPlayer = JSON.parse(JSON.stringify(MOCK_PLAYERS[0]));

        activeGridService = jasmine.createSpyObj('ActiveGridService', [], {
            grid$: mockGridSubject.asObservable(),
        });

        playerService = jasmine.createSpyObj('PlayerService', ['getPlayers'], {
            player: mockPlayer,
        });
        playerService.getPlayers.and.returnValue(of([mockPlayer]));

        socketService = jasmine.createSpyObj('SocketService', ['sendMessage', 'on', 'off']);

        turnService = jasmine.createSpyObj('TurnService', ['getCurrentTurn', 'isMyTurn', 'nextTurn', 'unfreezeTurn', 'isPartOfOwnTeam'], {
            onNewTurn: new BehaviorSubject<void>(undefined),
        });
        turnService.getCurrentTurn.and.returnValue(of(undefined));
        turnService.isMyTurn.and.returnValue(true);

        TestBed.configureTestingModule({
            providers: [
                ActionService,
                { provide: ActiveGridService, useValue: activeGridService },
                { provide: PlayerService, useValue: playerService },
                { provide: SocketService, useValue: socketService },
                { provide: TurnService, useValue: turnService },
            ],
        });

        actionService = TestBed.inject(ActionService);
        combatService = TestBed.inject(CombatService);

        actionService['_isCombat'] = false;
        actionService['_isAction'] = false;
        actionService['_turnSubscription'] = new Subscription();

        combatService.combatInitiator = undefined;
        combatService.attackedPlayer = undefined;
    });

    it('should be created', () => {
        expect(actionService).toBeTruthy();
    });

    it('should return true if a specific player is adjacent', () => {
        const grid: Grid = JSON.parse(JSON.stringify(GAME_DATA));
        grid.board[0][1].player = undefined;
        grid.board[0][0].player = mockPlayer;
        const result = actionService.isSpecificPlayerAdjacent({ x: 0, y: 1 } as Position, mockPlayer.id, grid);
        expect(result).toBeTrue();
    });

    it('should return false if a specific player is not adjacent', () => {
        const grid: Grid = JSON.parse(JSON.stringify(GAME_DATA));
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        const result = actionService.isSpecificPlayerAdjacent({ x: 4, y: 4 } as Position, 'nonexistent', grid);
        expect(result).toBeFalse();
    });

    describe('onToggledDoor', () => {
        it('should set OpenedDoor when isOpened is true', () => {
            const gridSubject = new BehaviorSubject<Grid | undefined>(JSON.parse(JSON.stringify(mockGrid)));
            const data = { ...toggleDoorData, isOpened: true };
            actionService.onToggledDoor(gridSubject, data);
            expect(gridSubject.value?.board[data.position.x][data.position.y].tile).toBe(TileTypes.OpenedDoor);
        });

        it('should set Door when isOpened is false', () => {
            const gridSubject = new BehaviorSubject<Grid | undefined>(JSON.parse(JSON.stringify(mockGrid)));
            const data = { ...toggleDoorData, isOpened: false };
            actionService.onToggledDoor(gridSubject, data);
            expect(gridSubject.value?.board[data.position.x][data.position.y].tile).toBe(TileTypes.Door);
        });

        it('should update hasActionLeft when current player turn', () => {
            const gridSubject = new BehaviorSubject<Grid | undefined>(JSON.parse(JSON.stringify(mockGrid)));
            turnService.isMyTurn.and.returnValue(true);
            actionService.onToggledDoor(gridSubject, toggleDoorData);
            expect(actionService.hasActionLeft).toBeFalse();
        });

        it('should not update hasActionLeft when not current player turn', () => {
            const gridSubject = new BehaviorSubject<Grid | undefined>(JSON.parse(JSON.stringify(mockGrid)));
            turnService.isMyTurn.and.returnValue(false);
            actionService.onToggledDoor(gridSubject, toggleDoorData);
            expect(actionService.hasActionLeft).toBeTrue();
        });
    });

    it('should send toggled door message if action is left', () => {
        actionService.sendToggledDoor({ x: 0, y: 0 }, 'room1', TileTypes.OpenedDoor);
        expect(socketService.sendMessage).toHaveBeenCalled();
    });

    it('should return current value of isActionClicked', () => {
        actionService.isActionClicked = true;
        expect(actionService.isActionClicked).toBeTrue();
    });

    it('should return current value of hasActionLeft', () => {
        expect(actionService.hasActionLeft).toBeTrue();
    });

    it('should return null from getPlayerPosition when not found', () => {
        const mockGridCopy = JSON.parse(JSON.stringify(mockGrid));
        for (const row of mockGridCopy.board) {
            for (const cell of row) {
                cell.player = null;
            }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (actionService as any).getPlayerPosition(mockGridCopy);
        expect(result).toBeNull();
    });

    describe('toggleDoorListener', () => {
        it('should register socket listener for DoorUpdate event', () => {
            const gridSubject = new BehaviorSubject<Grid | undefined>(JSON.parse(JSON.stringify(mockGrid)));
            actionService.toggleDoorListener(gridSubject);
            expect(socketService.on).toHaveBeenCalledWith(ActiveGameEvents.DoorUpdate, jasmine.any(Function));
        });

        it('should call onToggledDoor with correct parameters when event received', () => {
            const gridSubject = new BehaviorSubject<Grid | undefined>(JSON.parse(JSON.stringify(mockGrid)));
            const testData: ToggleDoor = {
                position: { x: 1, y: 1 },
                roomId: 'room1',
                isOpened: true,
            };
            const onToggledDoorSpy = spyOn(actionService, 'onToggledDoor');
            actionService.toggleDoorListener(gridSubject);
            const callback = socketService.on.calls.mostRecent().args[1];
            callback(testData);
            expect(onToggledDoorSpy).toHaveBeenCalledWith(gridSubject, testData);
        });

        it('should handle multiple events correctly', () => {
            const gridSubject = new BehaviorSubject<Grid | undefined>(JSON.parse(JSON.stringify(mockGrid)));
            const testData1: ToggleDoor = {
                position: { x: 1, y: 1 },
                roomId: 'room1',
                isOpened: true,
            };
            const testData2: ToggleDoor = {
                position: { x: 2, y: 2 },
                roomId: 'room1',
                isOpened: false,
            };
            const onToggledDoorSpy = spyOn(actionService, 'onToggledDoor');
            actionService.toggleDoorListener(gridSubject);
            const callback = socketService.on.calls.mostRecent().args[1];
            callback(testData1);
            callback(testData2);
            expect(onToggledDoorSpy).toHaveBeenCalledTimes(2);
            expect(onToggledDoorSpy.calls.argsFor(0)).toEqual([gridSubject, testData1]);
            expect(onToggledDoorSpy.calls.argsFor(1)).toEqual([gridSubject, testData2]);
        });
    });

    it('should unsubscribe from listeners on destroy', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const unsubscribeSpy = spyOn(actionService as any, 'stopTrackingGrid');
        actionService.ngOnDestroy();
        expect(unsubscribeSpy).toHaveBeenCalled();
    });

    describe('sendCombatAction', () => {
        it('should call combatService.sendCombatAction with correct parameters', () => {
            const spy = spyOn(combatService, 'sendCombatAction');
            const roomId = MOCK_ROOM.mapId as string;
            const player = MOCK_PLAYERS[0];
            const action = Actions.Attack;

            actionService.sendCombatAction(roomId, player, action);

            expect(spy).toHaveBeenCalledWith(roomId, player, Actions.Attack);
        });

        it('should handle Attack action correctly', () => {
            const spy = spyOn(combatService, 'sendCombatAction');
            const roomId = MOCK_ROOM.mapId as string;
            const player = MOCK_PLAYERS[0];
            const action = Actions.Attack;

            actionService.sendCombatAction(roomId, player, action);

            expect(spy).toHaveBeenCalledWith(roomId, player, action);
        });
    });

    describe('sendCombatInit', () => {
        it('should call combatService.sendCombatInit with correct parameters', () => {
            const spy = spyOn(combatService, 'sendCombatInit');
            const roomId = 'map1';
            const player = MOCK_PLAYERS[0];
            const action = Actions.Attack;

            actionService.sendCombatInit(roomId, player, action);

            expect(spy).toHaveBeenCalledWith(roomId, player, jasmine.stringMatching(/attack/i));
        });

        it('should handle invalid action string gracefully', () => {
            const spy = spyOn(combatService, 'sendCombatInit');
            const roomId = 'map1';
            const player = MOCK_PLAYERS[0];
            const invalidAction = 'invalid_action';

            actionService.sendCombatInit(roomId, player, invalidAction);

            expect(spy).toHaveBeenCalled();
        });
    });

    describe('getCurrentPlayer', () => {
        it('should set combatInitiator when player is received', () => {
            const testPlayer = MOCK_PLAYERS[0];
            turnService.getCurrentTurn.and.returnValue(of(testPlayer));

            actionService.getCurrentPlayer();

            expect(combatService.combatInitiator).toEqual(testPlayer);
        });

        it('should handle undefined player', () => {
            turnService.getCurrentTurn.and.returnValue(of(undefined));

            actionService.getCurrentPlayer();

            expect(combatService.combatInitiator).toBeUndefined();
        });

        it('should unsubscribe from previous subscription', () => {
            const testSubject = new Subject<Player>();
            turnService.getCurrentTurn.and.returnValue(testSubject.asObservable());

            actionService.getCurrentPlayer();
            actionService.getCurrentPlayer();

            testSubject.complete();
            expect().nothing();
        });
    });

    describe('getCombatWinner', () => {
        it('should call combatService.getCombatWinner', () => {
            const spy = spyOn(combatService, 'getCombatWinner');

            actionService.getCombatWinner();

            expect(spy).toHaveBeenCalled();
        });
    });

    describe('getAdjacentPlayerOrDoor', () => {
        it('should call checkAdjacentPlayersOrDoors and return boolean', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const spy = spyOn(actionService as any, 'checkAdjacentPlayersOrDoors');

            spy.and.callFake(() => {
                actionService['_isAction'] = true;
            });
            expect(actionService.getAdjacentPlayerOrDoor()).toBeTrue();

            spy.and.callFake(() => {
                actionService['_isAction'] = false;
            });
            expect(actionService.getAdjacentPlayerOrDoor()).toBeFalse();

            expect(spy).toHaveBeenCalledTimes(2);
        });
    });

    describe('checkAdjacentPlayersOrDoors', () => {
        it('should reset combat state when player position not found', () => {
            const grid: Grid = JSON.parse(JSON.stringify(GAME_DATA));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            spyOn(actionService as any, 'getPlayerPosition').and.returnValue(null);

            actionService['checkAdjacentPlayersOrDoors'](grid);

            expect(combatService.combatInitiator).toBeUndefined();
            expect(combatService.attackedPlayer).toBeUndefined();
            expect(actionService['_isAction']).toBeFalse();
        });

        it('should detect adjacent player and set combat state', () => {
            const grid: Grid = JSON.parse(JSON.stringify(GAME_DATA));
            const playerPos = { x: 1, y: 1 };
            const adjacentPlayer = MOCK_PLAYERS[1];
            grid.board[1][2].player = adjacentPlayer;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            spyOn(actionService as any, 'getPlayerPosition').and.returnValue(playerPos);

            actionService['checkAdjacentPlayersOrDoors'](grid);

            expect(combatService.attackedPlayer).toEqual(adjacentPlayer);
            expect(actionService['_isAction']).toBeTrue();
        });

        it('should detect adjacent door and set action flag', () => {
            const grid: Grid = JSON.parse(JSON.stringify(GAME_DATA));
            const playerPos = { x: 1, y: 1 };
            grid.board[1][2].tile = TileTypes.Door;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            spyOn(actionService as any, 'getPlayerPosition').and.returnValue(playerPos);

            actionService['checkAdjacentPlayersOrDoors'](grid);

            expect(actionService['_isAction']).toBeTrue();
        });

        it('should reset combat state when no adjacent actions', () => {
            const grid: Grid = JSON.parse(JSON.stringify(GAME_DATA));
            const playerPos = { x: 1, y: 1 };

            for (const row of grid.board) {
                for (const cell of row) {
                    cell.player = undefined;
                }
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            spyOn(actionService as any, 'getPlayerPosition').and.returnValue(playerPos);
            turnService.getCurrentTurn.and.returnValue(of(undefined));

            actionService['checkAdjacentPlayersOrDoors'](grid);

            expect(actionService['_isCombat']).toBeFalse();
            expect(combatService.attackedPlayer).toBeUndefined();
        });
    });

    describe('getPlayerPosition', () => {
        it('should return player position when found', () => {
            const testGrid: Grid = {
                ...JSON.parse(JSON.stringify(GAME_DATA)),
                board: [
                    [{ player: undefined, tile: TileTypes.Default, item: { name: '', description: '' } }],
                    [{ player: mockPlayer, tile: TileTypes.Default, item: { name: '', description: '' } }],
                ],
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = (actionService as any).getPlayerPosition(testGrid);
            expect(result).toEqual({ x: 1, y: 0 } as Position);
        });
    });

    describe('isCombat', () => {
        it('should set and get isCombat value', () => {
            actionService.isCombat = true;
            expect(actionService.isCombat).toBeTrue();
            actionService.isCombat = false;
            expect(actionService.isCombat).toBeFalse();
        });
    });

    describe('isAdjacent', () => {
        it('should return true for adjacent positions', () => {
            const pos1 = { x: 2, y: 2 } as Position;
            expect(actionService.isAdjacent(pos1, { x: 1, y: 2 } as Position)).toBeTrue();
            expect(actionService.isAdjacent(pos1, { x: 3, y: 2 } as Position)).toBeTrue();
        });
    });
});
