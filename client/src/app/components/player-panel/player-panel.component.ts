import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { IconPaths } from '@app/enums/player-panel-enums';
import { ActionService } from '@app/services/action/action.service';
import { PlayerService } from '@app/services/player/player.service';
import { SocketService } from '@app/services/socket/socket.service';
import { AVATARS } from '@common/avatar';
import { BASE_STAT } from '@common/constants';
import { ItemId } from '@common/enums';
import { ActiveGameEvents } from '@common/gateway-events';
import { CombatUpdate, Item, Player, PlayerNextPosition, Stats, TurnUpdate } from '@common/interfaces';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-player-panel',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './player-panel.component.html',
    styleUrls: ['./player-panel.component.scss'],
})
export class PlayerPanelComponent implements OnInit, OnDestroy {
    private _player: Player;
    private _iconPaths = IconPaths;
    private _actionsLeft = 1;
    private _destroy$ = new Subject<void>();
    private _inventory: Item[];
    private _hasAppliedPotionBuff = false;
    private _hasAppliedShieldBuff = false;
    private _previousInventory: Item[] = [];
    private _buffedStats: Stats = { attack: BASE_STAT, defense: BASE_STAT, life: BASE_STAT, speed: BASE_STAT };
    constructor(
        private playerService: PlayerService,
        private socketService: SocketService,
        private actionService: ActionService,
    ) {}

    get iconPaths() {
        return this._iconPaths;
    }

    get player() {
        return this._player;
    }

    get actionsLeft() {
        return this._actionsLeft;
    }

    get inventory() {
        return this._inventory;
    }

    get playerAvatar() {
        return AVATARS.find((avatar) => {
            return this.playerService.avatar === avatar.name;
        })?.image;
    }

    get buffedStats() {
        return this._buffedStats;
    }

    ngOnInit(): void {
        this._player = { ...this.playerService.player };
        this.socketInit();
        this.observersInit();
    }

    ngOnDestroy(): void {
        this.socketService.off(ActiveGameEvents.PlayerNextPosition);
        this.socketService.off(ActiveGameEvents.TurnUpdate);
        this.socketService.off(ActiveGameEvents.CombatUpdate);
        this._destroy$.next();
        this._destroy$.complete();
        this._inventory = [];
        this._buffedStats = { attack: BASE_STAT, defense: BASE_STAT, life: BASE_STAT, speed: BASE_STAT };
    }

    private applyBuffs() {
        if (!this._hasAppliedPotionBuff) {
            this.potionBuff();
        }

        if (!this._hasAppliedShieldBuff) {
            this.shieldBuff();
        }
    }
    private potionBuff() {
        const potion = this._inventory.find((i) => i.id === ItemId.Item1);
        if (potion) {
            const playerStats = this.player.stats as Stats;
            playerStats.life += 2;
            this._buffedStats.defense -= 1;
            this._hasAppliedPotionBuff = true;
        }
    }
    private shieldBuff() {
        const shield = this._inventory.find((i) => i.id === ItemId.Item3);
        if (shield) {
            this._buffedStats.defense += 2;
            this._buffedStats.attack -= 1;
            this._hasAppliedShieldBuff = true;
        }
    }
    private observersInit() {
        this.actionService.hasActionLeftSubject.pipe(takeUntil(this._destroy$)).subscribe((hasActionsLeft) => {
            this._actionsLeft = hasActionsLeft ? 1 : 0;
        });

        this.playerService.inventory$.pipe(takeUntil(this._destroy$)).subscribe((updatedInventory) => {
            this.handleInventory(updatedInventory);
        });
    }
    private handleInventory(updatedInventory: Item[]) {
        const hadPotionBefore = this._previousInventory.some((i) => i.id === ItemId.Item1);
        const hasPotionNow = updatedInventory.some((i) => i.id === ItemId.Item1);

        this.potionSequence(hasPotionNow, hadPotionBefore);

        const hadShieldBefore = this._previousInventory.some((i) => i.id === ItemId.Item3);
        const hasShieldNow = updatedInventory.some((i) => i.id === ItemId.Item3);

        this.shieldSequence(hasShieldNow, hadShieldBefore);

        this._inventory = updatedInventory;
        this.applyBuffs();
        this._previousInventory = [...updatedInventory];
    }
    private potionSequence(hasPotionNow: boolean, hadPotionBefore: boolean) {
        if (hasPotionNow && !hadPotionBefore) {
            this._hasAppliedPotionBuff = false;
        } else if (!hasPotionNow && this._hasAppliedPotionBuff) {
            const playerStats = this.player.stats as Stats;
            this._buffedStats.defense += 1;
            playerStats.life -= 2;
            this._hasAppliedPotionBuff = false;
        }
    }
    private shieldSequence(hasShieldNow: boolean, hadShieldBefore: boolean) {
        if (hasShieldNow && !hadShieldBefore) {
            this._hasAppliedShieldBuff = false;
        } else if (!hasShieldNow && this._hasAppliedShieldBuff) {
            this._buffedStats.attack += 1;
            this._buffedStats.defense -= 2;
            this._hasAppliedShieldBuff = false;
        }
    }
    private socketInit() {
        this.socketService.on<PlayerNextPosition>(ActiveGameEvents.PlayerNextPosition, (data) => {
            if (this.playerService.player.id === data.player.id) this._player = data.player;
        });
        this.socketService.on<TurnUpdate>(ActiveGameEvents.TurnUpdate, (data) => {
            if (data.player.id !== this._player.id && this._player.stats && this._player.stats.maxSpeed) {
                this._player.stats.speed = this._player.stats.maxSpeed;
            }
        });
        this.socketService.on<CombatUpdate>(ActiveGameEvents.CombatUpdate, (data) => {
            const defeatedPlayer = data.gameState?.players.find((playerToFind) => playerToFind.id === this.player.id);
            if (!defeatedPlayer?.stats?.life || !this._player?.stats) return;

            this._player.stats.life =
                defeatedPlayer.stats.life < 0 && this._player.stats.maxLife ? this._player.stats.maxLife : defeatedPlayer.stats.life;
        });
    }
}
