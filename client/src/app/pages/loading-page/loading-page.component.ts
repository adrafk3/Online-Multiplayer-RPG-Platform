import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PlayerCardComponent } from '@app/components/player-card/player-card.component';
import { PlayerService } from '@app/services/player/player.service';
import { SocketService } from '@app/services/socket/socket.service';
import { LOADING_DOTS_INTERVAL, MAX_N_COLUMNS, N_LOADING_DOTS } from '@common/constants';
import { GameModes, Players, VirtualPlayerTypes } from '@common/enums';
import { GameRoomEvents } from '@common/gateway-events';
import { LockResponse, Player, RoomData, SocketResponse } from '@common/interfaces';
import { interval, Subscription } from 'rxjs';
import { AlertService } from '@app/services/alert/alert.service';
import { GameModeService } from '@app/services/game-mode/game-mode.service';
import { MatTooltip } from '@angular/material/tooltip';
import { GameChatComponent } from '@app/components/game-chat/game-chat.component';
import { ChatService } from '@app/services/chat/chat.service';
import { Routes } from '@app/enums/routes-enums';
import { Loading } from '@app/enums/loading-page-enums';

@Component({
    selector: 'app-loading-page',
    templateUrl: './loading-page.component.html',
    styleUrls: ['./loading-page.component.scss'],
    imports: [CommonModule, PlayerCardComponent, MatTooltip, GameChatComponent],
    standalone: true,
    providers: [ChatService],
})
export class LoadingPageComponent implements OnInit, OnDestroy {
    isLocked: boolean = false;
    isLoading: boolean = true;
    loadingDots: string = '';
    players: Player[] = [];
    minPlayers: number;
    maxPlayers: number;
    isVirtualPlayerTypeVisible: boolean;
    private loadingDotsSubscription: Subscription;
    constructor(
        private socketService: SocketService,
        private playerService: PlayerService,
        private router: Router,
        private alertService: AlertService,
        private gameModeService: GameModeService,
    ) {}

    get gridColumns(): string {
        if (this.maxPlayers === Players.MediumMap && this.players.length > MAX_N_COLUMNS - 1) {
            return `repeat(${MAX_N_COLUMNS - 1}, 1fr)`;
        } else if (this.players.length <= MAX_N_COLUMNS) {
            return `repeat(${this.players.length}, 1fr)`;
        } else return `repeat(${MAX_N_COLUMNS}, 1fr)`;
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        const clickedInsideDropdown =
            event.target instanceof HTMLElement && (event.target.closest('.type-prompt') || event.target.closest('.add-player'));

        if (!clickedInsideDropdown) {
            this.isVirtualPlayerTypeVisible = false;
        }
    }

    ngOnInit() {
        if (this.playerService.player.avatar === 'Knuckles') {
            new Audio('/assets/audio/easter-egg.mp3').play();
        }
        if (this.playerService.roomId === '') {
            this.router.navigate([Routes.Home]).then(() => this.alertService.alert('Vous avez quitter la partie'));
        }
        this.playerService.updateRoom();
        this.setupRoomUpdateListener();
        this.loadingDotsSubscription = interval(LOADING_DOTS_INTERVAL).subscribe(() => {
            this.loadingDots = this.loadingDots.length < N_LOADING_DOTS ? this.loadingDots + '.' : '';
        });
    }
    ngOnDestroy() {
        this.socketService.off<SocketResponse>(GameRoomEvents.RoomUpdate);
        this.socketService.off<SocketResponse>(GameRoomEvents.ToggleLock);
        this.socketService.off(GameRoomEvents.StartGame);
        if (this.loadingDotsSubscription) {
            this.loadingDotsSubscription.unsubscribe();
        }
    }

    canStartGame() {
        return this.gameModeService.canStartGame(this.players.length);
    }

    checkLoadingState() {
        this.isLoading = this.players.length < this.maxPlayers && !this.isLocked;
        this.isVirtualPlayerTypeVisible = this.isLoading ? this.isVirtualPlayerTypeVisible : false;
    }

    addVirtualPlayer(event?: MouseEvent): void {
        if (event) event.stopPropagation();
        this.isVirtualPlayerTypeVisible = !this.isVirtualPlayerTypeVisible;
    }

    onChooseVirtualPlayerType(type: string): void {
        if (this.players.length < this.maxPlayers) {
            this.playerService.addVirtualPlayer(type as VirtualPlayerTypes);
            this.checkLoadingState();
        }
        this.isVirtualPlayerTypeVisible = false;
    }

    startGame(): void {
        this.playerService.startGame();
    }

    leaveGame(): void {
        this.playerService.quitGame();
    }

    onKick(player: Player): void {
        const playerToKickIndex = this.players.findIndex((p: Player) => p.id === player.id);
        if (playerToKickIndex !== -1) {
            this.playerService.kickPlayer(this.players[playerToKickIndex].id);
        }
    }

    isHost() {
        return this.playerService.player.isHost;
    }

    getRoomId() {
        return this.playerService.roomId;
    }

    onLock() {
        this.playerService.toggleLock();
    }
    getVirtualPlayerText(): string {
        return Loading.VirtualPlayer;
    }
    getStartText(): string {
        let message: string = Loading.StartText;
        if (!this.isLocked) {
            message += Loading.Locked;
        }
        if (this.players.length < 2) {
            if (message !== Loading.StartText) {
                message += ',';
            }
            message += Loading.MinPlayers;
        }
        if (this.gameModeService.gameMode !== GameModes.Classic && this.players.length % 2 !== 0) {
            if (message !== Loading.StartText) {
                message += ',';
            }
            message += Loading.PairNumber;
        }
        if (message === Loading.StartText) {
            return '';
        } else {
            message += '.';
        }

        return message;
    }
    private setupRoomUpdateListener() {
        this.socketService.on<RoomData>(GameRoomEvents.RoomUpdate, (data) => {
            if (data && Array.isArray(data.players)) {
                this.players = data.players;
                this.maxPlayers = data.playerMax;
                this.minPlayers = data.playerMin;
                this.isLocked = data.isLocked;
                this.checkLoadingState();
            }
        });
        this.socketService.on<LockResponse>(GameRoomEvents.ToggleLock, (data) => {
            if (data) {
                this.isLocked = data.isLocked;
                this.checkLoadingState();
            }
        });
        this.socketService.on<GameRoomEvents.StartGame>(GameRoomEvents.StartGame, () => {
            this.router.navigate([Routes.Game]).then();
        });
    }
}
