import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AlertService } from '@app/services/alert/alert.service';
import { SocketService } from '@app/services/socket/socket.service';
import { MAX_INVENTORY_SIZE } from '@common/constants';
import { MAX_PLAYERS_2, MAX_PLAYERS_4, MOCK_PLAYERS } from '@common/constants.spec';
import { VirtualPlayerTypes } from '@common/enums';
import { GameRoomEvents } from '@common/gateway-events';
import { HttpMessage } from '@common/http-message';
import { Item, RoomData, SocketResponse } from '@common/interfaces';
import { of, Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PlayerService } from './player.service';

// Les assertions non-null (!) sont utilisées dans ce fichier de test car :
// 1. L'environnement de test est entièrement contrôlé avec des données mockées
// 2. Les propriétés sont systématiquement initialisées avant leur utilisation
// 3. Les cas limites avec valeurs null/undefined sont testés séparément
// 4. Elles permettent de garder le code de test lisible et focalisé sur le comportement à vérifier

describe('PlayerService', () => {
    let service: PlayerService;
    let socketServiceMock: jasmine.SpyObj<SocketService>;
    let alertServiceMock: jasmine.SpyObj<AlertService>;
    let routerMock: jasmine.SpyObj<Router>;
    let httpMock: HttpTestingController;

    const roomId = 'room1';
    const players = [
        { id: 'player1', name: 'Player 1', avatar: 'avatar1', isHost: false },
        { id: 'player2', name: 'Player 2', avatar: 'avatar2', isHost: false },
    ];

    beforeEach(() => {
        socketServiceMock = jasmine.createSpyObj('SocketService', ['sendMessage', 'isConnected', 'on', 'off', 'getSocketId', 'disconnect']);
        socketServiceMock.isConnected.and.returnValue(new Subject<boolean>());
        alertServiceMock = jasmine.createSpyObj('AlertService', ['alert']);
        routerMock = jasmine.createSpyObj('Router', ['navigate']);
        routerMock.navigate.and.returnValue(Promise.resolve(true));

        TestBed.configureTestingModule({
            providers: [
                PlayerService,
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: SocketService, useValue: socketServiceMock },
                { provide: AlertService, useValue: alertServiceMock },
                { provide: Router, useValue: routerMock },
            ],
        });

        service = TestBed.inject(PlayerService);
        httpMock = TestBed.inject(HttpTestingController);
        service.roomId = roomId;
    });

    afterEach(() => {
        httpMock.verify();
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function setupHttpMock(url: string, method: string, response: any, status: number = HttpMessage.OK) {
        const req = httpMock.expectOne(url);
        expect(req.request.method).toBe(method);
        req.flush(response, { status, statusText: '' });
        tick();
    }

    it('should be created', fakeAsync(() => {
        expect(service).toBeTruthy();
        tick();
        expect(socketServiceMock.isConnected).toHaveBeenCalled();
    }));

    it('should validate room ID', fakeAsync(() => {
        service.validateRoomId().then((result) => {
            expect(result).toBe(roomId);
        });

        setupHttpMock(`${environment.serverUrl}/game-room/validate/${roomId}`, 'GET', {});
    }));

    it('should handle error when validating room ID', fakeAsync(() => {
        const errorMessage = 'Room not found';

        service.validateRoomId(roomId).catch((error) => {
            expect(error.status).toBe(HttpMessage.NotFound);
            expect(alertServiceMock.alert).toHaveBeenCalledWith(errorMessage);
        });

        setupHttpMock(`${environment.serverUrl}/game-room/validate/${roomId}`, 'GET', { message: errorMessage }, HttpMessage.NotFound);
    }));

    it('should select avatar', fakeAsync(() => {
        service.player = players[0];

        service.selectAvatar();

        setupHttpMock(`${environment.serverUrl}/game-room/selectAvatar`, 'POST', { player: players[0] });

        expect(service.player).toEqual(players[0]);
        expect(routerMock.navigate).toHaveBeenCalledWith(['/loading/', roomId]);
    }));

    it('should handle error when selecting avatar', fakeAsync(() => {
        const errorMessage = 'Avatar already selected';

        service.selectAvatar();

        setupHttpMock(`${environment.serverUrl}/game-room/selectAvatar`, 'POST', { message: errorMessage }, HttpMessage.BadRequest);

        expect(alertServiceMock.alert).toHaveBeenCalledWith(errorMessage);
    }));

    it('should create game', fakeAsync(() => {
        const gameId = 'game1';

        service.createGame(gameId);

        setupHttpMock(`${environment.serverUrl}/game-room/create`, 'POST', { roomId });

        expect(service.roomId).toBe(roomId);
        expect(routerMock.navigate).toHaveBeenCalledWith(['/stats']);
    }));

    it('should handle error when creating game', fakeAsync(() => {
        const gameId = 'game1';
        const errorMessage = 'Game creation failed';

        service.createGame(gameId);

        setupHttpMock(`${environment.serverUrl}/game-room/create`, 'POST', { message: errorMessage }, HttpMessage.BadRequest);

        expect(alertServiceMock.alert).toHaveBeenCalledWith(errorMessage);
    }));

    it('should update room', () => {
        service.updateRoom();
        expect(socketServiceMock.sendMessage).toHaveBeenCalledWith(GameRoomEvents.RoomUpdate, { roomId });
    });

    it('should update avatars', () => {
        service.updateAvatars();
        expect(socketServiceMock.sendMessage).toHaveBeenCalledWith(GameRoomEvents.AvatarUpdate, { roomId });
    });

    it('should kick player', () => {
        const player = 'player1';
        service.kickPlayer(player);
        expect(socketServiceMock.sendMessage).toHaveBeenCalledWith(GameRoomEvents.KickPlayer, { player, roomId });
    });

    it('should join game', () => {
        service.joinGame(roomId, true);
        expect(service.player.isHost).toBe(true);
        expect(service.roomId).toBe(roomId);
        expect(socketServiceMock.sendMessage).toHaveBeenCalledWith(GameRoomEvents.JoinGame, { roomId });
    });

    it('should start game', () => {
        service.startGame();
        expect(socketServiceMock.sendMessage).toHaveBeenCalledWith(GameRoomEvents.StartGame, { roomId });
    });

    it('should quit game', () => {
        service.quitGame();
        expect(socketServiceMock.disconnect).toHaveBeenCalled();
    });

    it('should add virtual player', () => {
        service.addVirtualPlayer(VirtualPlayerTypes.Defensive);
        expect(socketServiceMock.sendMessage).toHaveBeenCalledWith(GameRoomEvents.AddVirtualPlayer, {
            roomId,
            type: VirtualPlayerTypes.Defensive,
        });
    });

    it('should toggle lock', () => {
        service.toggleLock();
        expect(socketServiceMock.sendMessage).toHaveBeenCalledWith(GameRoomEvents.ToggleLock, { roomId: 'room1' });
    });

    it('should navigate to home and alert when disconnected with roomId', fakeAsync(() => {
        const alertMessage = 'Vous avez quitté la partie';

        socketServiceMock.isConnected.and.returnValue(of(false));
        service['setupListeners']();

        tick();
        expect(service.roomId).toBe('');
        expect(routerMock.navigate).toHaveBeenCalledWith(['/home']);
        expect(alertServiceMock.alert).toHaveBeenCalledWith(alertMessage);
    }));

    it('should set playerId if socket connects', fakeAsync(() => {
        socketServiceMock.isConnected.and.returnValue(of(true));
        socketServiceMock.getSocketId.and.returnValue('id1');
        service['setupListeners']();

        tick();
        expect(service.player.id).toBe('id1');
    }));

    it('should handle KickUpdate event', fakeAsync(() => {
        const kickMessage = 'You have been kicked from the game';
        const kickData: SocketResponse = { message: kickMessage, success: true };

        service['setupListeners']();
        socketServiceMock.on.calls.argsFor(0)[1](kickData);

        tick();
        expect(service.roomId).toBe('');
        expect(routerMock.navigate).toHaveBeenCalledWith(['/home']);
        expect(alertServiceMock.alert).toHaveBeenCalledWith(kickMessage);
    }));

    it('should get players', fakeAsync(() => {
        service.getPlayers().subscribe((result) => {
            expect(result).toEqual(players);
        });

        setupHttpMock(`${environment.serverUrl}/game-room/${roomId}/players`, 'GET', players);
    }));

    it('should return an empty array if roomId is not set', fakeAsync(() => {
        service.roomId = '';

        service.getPlayers().subscribe((result) => {
            expect(result).toEqual([]);
        });

        tick();
    }));
    it('should update the player', () => {
        MOCK_PLAYERS[0].avatar = '';
        service.player = MOCK_PLAYERS[0];
        const roomData: RoomData = {
            mapId: 'test-map',
            playerMax: MAX_PLAYERS_4,
            playerMin: MAX_PLAYERS_2,
            players: [MOCK_PLAYERS[0]],
            selectedAvatars: new Map(),
            isLocked: true,
        };
        socketServiceMock.on.and.callFake((event, callback) => {
            if (event === 'roomUpdateResponse') (callback as (data: RoomData) => void)(roomData);
        });

        socketServiceMock.on.calls.allArgs().forEach(([event, callback]) => {
            if (event === 'roomUpdateResponse') callback(roomData);
        });

        expect(service.player).toEqual(MOCK_PLAYERS[0]);
    });
    it('should call setupListeners when createGame is called and isInitialized is false', fakeAsync(() => {
        service['isInitialized'] = false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const setupListenersSpy = spyOn(service as any, 'setupListeners');
        service.createGame('game1');
        setupHttpMock(`${environment.serverUrl}/game-room/create`, 'POST', { roomId });
        expect(setupListenersSpy).toHaveBeenCalled();
    }));
    it('should call setupListeners when validateRoomId is called and isInitialized is false', fakeAsync(() => {
        service['isInitialized'] = false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const setupListenersSpy = spyOn(service as any, 'setupListeners');
        service.validateRoomId().then(() => {
            expect(setupListenersSpy).toHaveBeenCalled();
        });
        setupHttpMock(`${environment.serverUrl}/game-room/validate/${roomId}`, 'GET', {});
    }));
    it('should return avatar', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any)._avatar = '123';
        expect(service.avatar).toBe('123');
    });

    describe('PlayerService inventory management', () => {
        it('should expose inventory as observable', (done) => {
            const testItems: Item[] = [
                { id: '1', image: 'img1', tooltip: 'Tooltip 1' },
                { id: '2', image: 'img2', tooltip: 'Tooltip 2', selected: true, uniqueId: 'uniq-2' },
            ];

            service.inventory$.subscribe({
                next: (items) => {
                    if (items.length > 0) {
                        expect(items).toEqual(testItems);
                        done();
                    }
                },
                error: done.fail,
            });

            service.updateInventory(testItems);
        });

        it('should update inventory and notify subscribers', () => {
            const initialItems: Item[] = [{ id: '1', image: 'img1', tooltip: 'Tooltip 1' }];
            const newItems: Item[] = [
                { id: '1', image: 'img1', tooltip: 'Tooltip 1' },
                { id: '2', image: 'img2', tooltip: 'Tooltip 2', selected: true },
            ];

            let receivedItems: Item[] = [];
            service.inventory$.subscribe((items) => {
                receivedItems = items;
            });

            service.updateInventory(initialItems);
            expect(receivedItems).toEqual(initialItems);

            service.updateInventory(newItems);
            expect(receivedItems).toEqual(newItems);
        });

        it('should check if item can be added to inventory', () => {
            expect(service.canAddToInventory()).toBeTrue();

            service.player.inventory = Array(MAX_INVENTORY_SIZE - 1).fill({ id: '1', image: 'img', tooltip: 'tip' } as Item);
            expect(service.canAddToInventory()).toBeTrue();

            service.player.inventory = Array(MAX_INVENTORY_SIZE).fill({ id: '1', image: 'img', tooltip: 'tip' } as Item);
            expect(service.canAddToInventory()).toBeFalse();
        });

        it('should add item to inventory', () => {
            const initialItem: Item = { id: '1', image: 'img1', tooltip: 'Tooltip 1' };
            const newItem: Item = { id: '2', image: 'img2', tooltip: 'Tooltip 2', uniqueId: 'uniq-2' };

            service.player.inventory = [initialItem];
            service.addItemToInventory(newItem);

            expect(service.player.inventory).toEqual([initialItem, newItem]);
        });

        it('should remove item from inventory by id', () => {
            const item1: Item = { id: '1', image: 'img1', tooltip: 'Tooltip 1' };
            const item2: Item = { id: '2', image: 'img2', tooltip: 'Tooltip 2', uniqueId: 'uniq-2' };

            service.player.inventory = [item1, item2];
            service.removeItemFromInventory(item1);

            expect(service.player.inventory).toEqual([item2]);
        });

        it('should handle removing non-existent item', () => {
            const item1: Item = { id: '1', image: 'img1', tooltip: 'Tooltip 1' };
            const item2: Item = { id: '2', image: 'img2', tooltip: 'Tooltip 2' };
            const nonExistentItem: Item = { id: '3', image: 'img3', tooltip: 'Tooltip 3' };

            service.player.inventory = [item1, item2];
            service.removeItemFromInventory(nonExistentItem);

            expect(service.player.inventory).toEqual([item1, item2]);
        });

        it('should clear inventory on reset', () => {
            const item1: Item = { id: '1', image: 'img1', tooltip: 'Tooltip 1', selected: true };
            const item2: Item = { id: '2', image: 'img2', tooltip: 'Tooltip 2', uniqueId: 'uniq-2' };

            service.player.inventory = [item1, item2];
            service['reset']();

            expect(service.player.inventory).toEqual([]);
        });

        it('should maintain item selection state when updating inventory', () => {
            const items: Item[] = [
                { id: '1', image: 'img1', tooltip: 'Tooltip 1', selected: true },
                { id: '2', image: 'img2', tooltip: 'Tooltip 2' },
            ];

            service.updateInventory(items);
            expect(service.player.inventory?.[0].selected).toBeTrue();
            expect(service.player.inventory?.[1].selected).toBeFalsy();
        });

        it('should handle items with uniqueId when updating inventory', () => {
            const items: Item[] = [
                { id: '1', image: 'img1', tooltip: 'Tooltip 1', uniqueId: 'uniq-1' },
                { id: '2', image: 'img2', tooltip: 'Tooltip 2' },
            ];

            service.updateInventory(items);
            expect(service.player.inventory?.[0].uniqueId).toBe('uniq-1');
            expect(service.player.inventory?.[1].uniqueId).toBeUndefined();
        });
    });

    describe('Inventory Edge Cases', () => {
        let testItem1: Item;
        let testItem2: Item;

        beforeEach(() => {
            testItem1 = { id: '1', image: 'img1', tooltip: 'Tooltip 1' };
            testItem2 = { id: '2', image: 'img2', tooltip: 'Tooltip 2' };
        });

        it('should initialize inventory when adding item to null inventory', () => {
            service.player.inventory = undefined;

            service.addItemToInventory(testItem1);

            expect(service.player.inventory).toBeDefined();
            // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
            expect(service.player.inventory!.length).toBe(1);
            expect(service.player.inventory?.[0]).toEqual(jasmine.objectContaining(testItem1));
        });

        it('should handle removeItemFromInventory when inventory is null', () => {
            service.player.inventory = undefined;

            expect(() => service.removeItemFromInventory(testItem1)).not.toThrow();
            expect(service.player.inventory).toBeUndefined();
        });

        it('should maintain inventory reference when adding items', () => {
            service.player.inventory = undefined;

            service.addItemToInventory(testItem1);
            const initialInventory = service.player.inventory;

            service.addItemToInventory(testItem2);

            expect(service.player.inventory).toEqual(initialInventory);
            // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
            expect(service.player.inventory!.length).toBe(2);
        });
    });
});
