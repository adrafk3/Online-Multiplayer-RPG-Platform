import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CombatChoiceComponent } from '@app/components/combat-choice/combat-choice.component';
import { ActiveGridService } from '@app/services/active-grid/active-grid.service';
import { CombatService } from '@app/services/combat/combat.service';
import { AVATARS } from '@common/avatar';
import { BASE_STAT, ICE_DEBUFF, MAX_ESCAPE_ATTEMPTS, MS_IN_SECOND, SNACKBAR_TIME } from '@common/constants';
import { CombatResults, TileTypes } from '@common/enums';
import { BoardCell, CombatUpdate, Player, Stats } from '@common/interfaces';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-vs-pop-up',
    standalone: true,
    imports: [CommonModule, CombatChoiceComponent],
    templateUrl: './vs-pop-up.component.html',
    styleUrl: './vs-pop-up.component.scss',
})
export class VsPopUpComponent implements OnInit, OnDestroy {
    private readonly _fireBackgroundPath: string = './assets/fire-background.gif';
    private readonly _iceDebuff: string = './assets/ice-debuff.gif';
    private _isVisible: boolean = false;
    private _combatInitiator?: Player;
    private _attacker?: Player;
    private _attackedPlayer?: Player;
    private _attackedDiceRoll: number | string = '-';
    private _initiatorDiceRoll: number | string = '-';
    private escapeAttemptsSubscription?: Subscription;
    private diceRollSubscription?: Subscription;
    private gridSubscription?: Subscription;
    private winnerIdSubscription?: Subscription;
    private board: BoardCell[][];
    private _winnerId: string;
    private _isInitiatorAttacker: boolean;
    private _isAttacking: boolean = false;
    private _attackAnimationTimeout?: number;

    constructor(
        private combatService: CombatService,
        private activeGridService: ActiveGridService,
    ) {}

    get attackedDiceRoll(): number | string {
        return this._attackedDiceRoll;
    }
    get isInitiatorAttacker(): boolean {
        return this._isInitiatorAttacker;
    }

    get iceDebuff(): string {
        return this._iceDebuff;
    }

    get initiatorDiceRoll(): number | string {
        return this._initiatorDiceRoll;
    }

    get backgroundPath(): string {
        return this._fireBackgroundPath;
    }

    get isVisible(): boolean {
        return this._isVisible;
    }

    get combatInitiator(): Player | undefined {
        return this._combatInitiator;
    }

    get attacker(): Player | undefined {
        return this._attacker;
    }

    get attackedPlayer(): Player | undefined {
        return this._attackedPlayer;
    }

    get isAttacking(): boolean {
        return this._isAttacking;
    }

    initiateFight(): void {
        this._combatInitiator = this.combatService.combatInitiator;
        this._attackedPlayer = this.combatService.attackedPlayer;

        if (this._combatInitiator) {
            this._combatInitiator.isIceApplied = this.isPlayerOnIceTile(this._combatInitiator);
        }
        if (this._attackedPlayer) {
            this._attackedPlayer.isIceApplied = this.isPlayerOnIceTile(this._attackedPlayer);
        }
        this._isVisible = true;
    }

    endFight() {
        if (this._combatInitiator && this._attackedPlayer && this._combatInitiator.stats && this._attackedPlayer.stats) {
            if (this._combatInitiator.id === this._winnerId) {
                this._attackedPlayer.stats.life = 0;
            } else {
                this._combatInitiator.stats.life = 0;
            }
        }
        setTimeout(() => {
            this._combatInitiator = undefined;
            this._attackedPlayer = undefined;
            this._attackedDiceRoll = '-';
            this._initiatorDiceRoll = '-';
            this._isVisible = false;
        }, MS_IN_SECOND);
    }

    rolePlayer(player: Player | undefined): string {
        if (player) {
            if (this.combatService.combatUpdateData?.gameState?.combat?.attacker === player?.id) {
                return 'Attaquant:';
            }
            return 'Defenseur:';
        }
        return '';
    }

    getAvatarIdleAnimation(avatarName: string | undefined): string {
        if (avatarName) {
            const avatar = AVATARS.find((a) => a.name === avatarName);
            if (avatar) {
                return avatar.combatIdle as string;
            }
        }
        return 'assets/avatar_combat/avatar_idle/archer.gif';
    }

    getAvatarAttackAnimation(avatarName: string | undefined): string {
        if (avatarName) {
            const avatar = AVATARS.find((a) => a.name === avatarName);
            if (avatar) {
                return avatar.attack as string;
            }
        }
        return 'assets/avatar_combat/avatar_attack/archer.gif';
    }

    ngOnInit(): void {
        this.gridSubscription = this.activeGridService.grid$.subscribe((grid) => {
            if (grid) {
                this.board = grid.board;
            }
        });
        this.escapeAttemptsSubscription = this.combatService.escapeAttemptsUpdated.subscribe(({ playerId }) => {
            this.updateEscapeAttempts(playerId);
        });

        this.diceRollSubscription = this.combatService.diceRoll.subscribe((data) => {
            if (data.message === CombatResults.CombatStarted) {
                this._isInitiatorAttacker = this._combatInitiator?.id === data.gameState?.combat?.attacker;
                return;
            }
            this.handleDiceRoll(data);
        });

        this.winnerIdSubscription = this.combatService.getCombatWinner().subscribe((winner) => {
            if (winner) {
                this._winnerId = winner;
            }
        });
    }

    ngOnDestroy(): void {
        if (this._attackAnimationTimeout) {
            clearTimeout(this._attackAnimationTimeout);
        }

        this.gridSubscription?.unsubscribe();
        this.escapeAttemptsSubscription?.unsubscribe();
        this.diceRollSubscription?.unsubscribe();
        this.winnerIdSubscription?.unsubscribe();
    }

    private isPlayerOnIceTile(player: Player): boolean {
        if (!player.position || !this.board) return false;
        const playerStats = player.stats as Stats;
        const tile = this.board[player.position.x]?.[player.position.y];
        if (tile?.tile === TileTypes.Ice) {
            playerStats.attack = ICE_DEBUFF;
            playerStats.defense = ICE_DEBUFF;
        } else {
            playerStats.attack = BASE_STAT;
            playerStats.defense = BASE_STAT;
        }
        return tile?.tile === TileTypes.Ice;
    }

    private updateEscapeAttempts(playerId: string): void {
        if (this._combatInitiator?.id === playerId && this._attackedPlayer) {
            this._attackedPlayer.escapeAttempts = (this._attackedPlayer.escapeAttempts ?? MAX_ESCAPE_ATTEMPTS) - 1;
        } else if (this._attackedPlayer?.id === playerId && this._combatInitiator) {
            this._combatInitiator.escapeAttempts = (this._combatInitiator.escapeAttempts ?? MAX_ESCAPE_ATTEMPTS) - 1;
        }
    }

    private async handleDiceRoll(data: CombatUpdate): Promise<void> {
        if (data.message === CombatResults.AttackNotDefeated) {
            const attackerPlayer = data.gameState?.players.find((p) => p.id === data.gameState?.combat?.defender);
            if (attackerPlayer) {
                await this.startAttackAnimation(attackerPlayer);
                this.combatService.notifyAnimationComplete();
            }
        }
        if (this._combatInitiator?.stats && this._attackedPlayer?.stats) {
            const initiator = data.gameState?.players.find((player) => player.id === this._combatInitiator?.id) as Player;
            const attacked = data.gameState?.players.find((player) => player.id === this._attackedPlayer?.id) as Player;
            if (initiator?.stats && attacked?.stats) {
                this._combatInitiator.stats.life = initiator.stats.life;
                this._attackedPlayer.stats.life = attacked.stats.life;
            }

            this._isInitiatorAttacker = this._combatInitiator?.id === data.gameState?.combat?.attacker;

            if (this._isInitiatorAttacker) {
                this._initiatorDiceRoll = data.diceDefense as number;
                this._attackedDiceRoll = data.diceAttack as number;
                this._attackedPlayer.stats.attack = data.attack as number;
                this._combatInitiator.stats.defense = data.defense as number;
            } else {
                this._attackedDiceRoll = data.diceDefense as number;
                this._initiatorDiceRoll = data.diceAttack as number;
                this._combatInitiator.stats.attack = data.attack as number;
                this._attackedPlayer.stats.defense = data.defense as number;
            }
        }
    }

    private async startAttackAnimation(attacker: Player): Promise<void> {
        return new Promise((resolve) => {
            this._isAttacking = true;
            this._attacker = attacker;
            const avatar = AVATARS.find((a) => a.name === attacker.avatar);
            const duration = avatar?.attackDuration || SNACKBAR_TIME;

            if (this._attackAnimationTimeout) {
                clearTimeout(this._attackAnimationTimeout);
            }

            this._attackAnimationTimeout = window.setTimeout(() => {
                this._isAttacking = false;
                this._attacker = undefined;
                resolve();
            }, duration);
        });
    }
}
