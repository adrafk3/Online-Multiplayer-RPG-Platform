import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertService } from '@app/services/alert/alert.service';
import { SocketService } from '@app/services/socket/socket.service';
import { AVATARS } from '@common/avatar';
import { GAME_ROOM_URL, MAX_INVENTORY_SIZE } from '@common/constants';
import { VirtualPlayerTypes } from '@common/enums';
import { GameRoomEvents } from '@common/gateway-events';
import {
    CreateGameResponse,
    Item,
    KickPayload,
    Player,
    SelectAvatarResponse,
    SocketPayload,
    SocketResponse,
    VirtualPlayerPayload,
} from '@common/interfaces';
import { BehaviorSubject, Observable, Subject, takeUntil } from 'rxjs';
import { Routes } from '@app/enums/routes-enums';
import { PlayerRoutes } from '@app/enums/player-enums';

@Injectable({
    providedIn: 'root',
})
export class PlayerService implements OnDestroy {
    private _avatar: string;
    private _player: Player = {
        name: '',
        id: '',
        avatar: AVATARS[0].name,
        stats: undefined,
        isHost: false,
    };

    private _roomId: string = '';
    private destroy$ = new Subject<void>();
    private isInitialized = false;
    private _inventory: Item[] = [];
    private _inventorySubject: BehaviorSubject<Item[]> = new BehaviorSubject<Item[]>(this._inventory);

    constructor(
        private socketService: SocketService,
        private router: Router,
        private alertService: AlertService,
        private http: HttpClient,
    ) {
        this.setupListeners();
        this.isInitialized = true;
    }

    get inventory$() {
        return this._inventorySubject.asObservable();
    }
    get avatar() {
        return this._avatar;
    }
    get player() {
        return this._player;
    }
    get roomId() {
        return this._roomId;
    }
    set player(player: Player) {
        this._player = player;
    }
    set roomId(roomId: string) {
        this._roomId = roomId;
    }

    updateInventory(newInventory: Item[]): void {
        this._inventory = newInventory;
        this._player.inventory = [...newInventory];
        this._inventorySubject.next(this._inventory);
    }

    getPlayers(): Observable<Player[]> {
        if (this.roomId) {
            return this.http.get<Player[]>(`${GAME_ROOM_URL}/${this.roomId}${PlayerRoutes.Players}`);
        } else {
            return new Observable<Player[]>((observer) => {
                observer.next([]);
                observer.complete();
            });
        }
    }

    canAddToInventory(): boolean {
        const inventory = this.player.inventory ?? [];
        return inventory.length < MAX_INVENTORY_SIZE;
    }

    addItemToInventory(item: Item): void {
        if (!this.player.inventory) {
            this.player.inventory = [];
        }
        const inventory = this.player.inventory as Item[];
        inventory.push(item);
        this.player.inventory = inventory;
        this.updateInventory(inventory);
    }

    removeItemFromInventory(item: Item): void {
        if (!this.player.inventory || !item) {
            return;
        }
        const inventory = this.player.inventory as Item[];
        this.player.inventory = inventory.filter((itemToCheck) => {
            return itemToCheck.id !== item.id;
        });
        this.updateInventory(this.player.inventory);
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
        this._inventorySubject.next([]);
        this.socketService.off(GameRoomEvents.KickUpdate);
        this.socketService.off(GameRoomEvents.RoomUpdate);
    }
    async validateRoomId(roomId = this.roomId): Promise<string> {
        if (!this.isInitialized) {
            this.isInitialized = !this.isInitialized;
            this.setupListeners();
        }
        return new Promise((resolve, reject) => {
            this.http.get(`${GAME_ROOM_URL}${PlayerRoutes.Validate}/${roomId}`).subscribe({
                next: () => resolve(roomId),
                error: (error: HttpErrorResponse) => {
                    this.alertService.alert(error.error.message);
                    reject(error);
                },
            });
        });
    }
    selectAvatar(): void {
        this.http
            .post<SelectAvatarResponse>(`${GAME_ROOM_URL}${PlayerRoutes.SelectAvatar}`, { roomId: this._roomId, player: this._player })
            .subscribe({
                next: (response) => {
                    this._player = response.player;
                    if (response.player.avatar) this._avatar = response.player.avatar;
                    this.updateAvatars();
                    this.router.navigate([`${Routes.Loading}/`, this.roomId]).then();
                },
                error: (error: HttpErrorResponse) => {
                    this.quitGame();
                    setTimeout(() => {
                        this.alertService.alert(error.error?.message);
                    });
                },
            });
    }
    createGame(gameId: string): void {
        if (!this.isInitialized) {
            this.isInitialized = !this.isInitialized;
            this.setupListeners();
        }
        this.http.post<CreateGameResponse>(`${GAME_ROOM_URL}${PlayerRoutes.Create}`, { gameId }).subscribe({
            next: (response) => {
                if (response.roomId) {
                    this._roomId = response.roomId;
                    this.joinGame(this.roomId, true);
                    this.router.navigate([Routes.Stats]).then();
                }
            },
            error: (error: HttpErrorResponse) => {
                this.alertService.alert(error.error?.message);
            },
        });
    }
    updateRoom() {
        this.socketService.sendMessage<SocketPayload>(GameRoomEvents.RoomUpdate, { roomId: this._roomId });
    }
    updateAvatars() {
        this.socketService.sendMessage<SocketPayload>(GameRoomEvents.AvatarUpdate, { roomId: this._roomId });
    }
    kickPlayer(player: string) {
        this.socketService.sendMessage<KickPayload>(GameRoomEvents.KickPlayer, { player, roomId: this._roomId });
    }
    joinGame(roomId: string, isHost: boolean) {
        this._player.isHost = isHost;
        this._roomId = roomId;
        this.socketService.sendMessage<SocketPayload>(GameRoomEvents.JoinGame, { roomId });
    }
    startGame() {
        this.socketService.sendMessage<SocketPayload>(GameRoomEvents.StartGame, { roomId: this._roomId });
    }
    quitGame() {
        this.socketService.disconnect();
    }
    addVirtualPlayer(type: VirtualPlayerTypes) {
        this.socketService.sendMessage<VirtualPlayerPayload>(GameRoomEvents.AddVirtualPlayer, { roomId: this._roomId, type });
    }
    toggleLock() {
        this.socketService.sendMessage<SocketPayload>(GameRoomEvents.ToggleLock, { roomId: this._roomId });
    }
    private setupListeners() {
        this.socketService
            .isConnected()
            .pipe(takeUntil(this.destroy$))
            .subscribe((isConnected) => {
                if (!isConnected) {
                    if (this._roomId) {
                        this.reset();
                        this.router.navigate([Routes.Home]).then(() => {
                            this.alertService.alert('Vous avez quitté la partie');
                        });
                    }
                } else {
                    this._player.id = this.socketService.getSocketId();
                }
            });
        this.socketService.on<SocketResponse>(GameRoomEvents.KickUpdate, (data) => {
            this.reset();
            if (data.message) this.router.navigate([Routes.Home]).then(() => this.alertService.alert(data.message as string));
        });
    }
    private reset() {
        this._roomId = '';
        this._player = {
            name: '',
            id: '',
            isHost: false,
            avatar: AVATARS[0].name,
            stats: undefined,
            inventory: [],
        };
        this.ngOnDestroy();
        this._inventory = [];
        this._inventorySubject.next([]);
        this.isInitialized = false;
    }
}
