import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CombatService } from '@app/services/combat/combat.service';
import { GameModeService } from '@app/services/game-mode/game-mode.service';
import { PlayerService } from '@app/services/player/player.service';
import { SocketService } from '@app/services/socket/socket.service';
import { TurnService } from '@app/services/turn/turn-service';
import { VirtualPlayerTypes } from '@common/enums';
import { CTFEvents } from '@common/gateway-events';
import { FlagHolderPayload, Player } from '@common/interfaces';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-player-list',
    imports: [CommonModule],
    templateUrl: './player-list.component.html',
    styleUrl: './player-list.component.scss',
    standalone: true,
})
export class PlayerListComponent implements OnDestroy, OnInit {
    private _staticPlayers: Player[] = [];
    private _disconnectedPlayers: Player[] = [];
    private _currentTurn: Player | undefined;
    private _subscription: Subscription = new Subscription();
    private _flagHolderId: string | undefined;

    constructor(
        private combatService: CombatService,
        private turnService: TurnService,
        private playerService: PlayerService,
        private gameModeService: GameModeService,
        private socketService: SocketService,
    ) {}

    get currentTurn() {
        return this._currentTurn;
    }
    get flagHolderId() {
        return this._flagHolderId;
    }
    get staticPlayers() {
        return this._staticPlayers;
    }
    ngOnInit() {
        this.trackPlayerChanges();
    }

    ngOnDestroy() {
        this._subscription.unsubscribe();
        this.socketService.off(CTFEvents.FlagTaken);
        this.socketService.off(CTFEvents.FlagDropped);
    }

    isPlayerDisconnected(playerId: string): boolean {
        if (!this._staticPlayers.length) return false;
        return this._disconnectedPlayers.some((playerToFind) => playerToFind.id === playerId);
    }

    isCtf() {
        return this.gameModeService.isCtf();
    }

    getTeamNumber(playerId: string) {
        return this.gameModeService.getTeamNumber(playerId);
    }

    isPartOfOwnTeam(playerId: string) {
        return this.gameModeService.isPartOfOwnTeam(playerId);
    }

    virtualPlayerType(player: Player) {
        if (player.type) {
            return player.type === VirtualPlayerTypes.Defensive ? 'DEF' : 'AGR';
        }
        return '---';
    }

    private trackCurrentTurn() {
        this._subscription.add(
            this.turnService.getCurrentTurn().subscribe({
                next: (player) => {
                    this._currentTurn = player;
                },
            }),
        );
    }

    private trackGameUpdates() {
        this._subscription.add(
            this.turnService.getQuittingPlayerId().subscribe((playerId) => {
                const player = this._staticPlayers.find((playerToFind) => playerToFind.id === playerId);
                if (player) {
                    this._disconnectedPlayers.push(player);
                }
            }),
        );

        this._subscription.add(
            this.combatService.getCombatWinner().subscribe((winnerId) => {
                const player = this._staticPlayers.find((playerToFind) => playerToFind.id === winnerId);
                if (player) {
                    player.victories = (player.victories ?? 0) + 1;
                    this._staticPlayers = [...this._staticPlayers];
                }
            }),
        );
    }

    private trackPlayers() {
        this._subscription.add(
            this.playerService.getPlayers().subscribe({
                next: (staticPlayers) => {
                    if (this._staticPlayers.length === 0) {
                        this._staticPlayers = [...staticPlayers];
                    }
                },
            }),
        );
    }

    private trackPlayerChanges(): void {
        this.socketService.on<FlagHolderPayload>(CTFEvents.FlagTaken, (data) => {
            this._flagHolderId = data.flagHolder.id;
        });
        this.socketService.on(CTFEvents.FlagDropped, () => {
            this._flagHolderId = undefined;
        });
        this.trackCurrentTurn();
        this.trackPlayers();
        this.trackGameUpdates();
    }
}
