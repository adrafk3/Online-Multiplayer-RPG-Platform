import { EventEmitter, Injectable, Injector, OnDestroy } from '@angular/core';
import { ActionService } from '@app/services/action/action.service';
import { AlertService } from '@app/services/alert/alert.service';
import { PlayerService } from '@app/services/player/player.service';
import { SocketService } from '@app/services/socket/socket.service';
import { TurnService } from '@app/services/turn/turn-service';
import { Actions, CombatResults } from '@common/enums';
import { ActiveGameEvents } from '@common/gateway-events';
import { CombatAction, CombatUpdate, GameDisconnect, Player, PlayerAction } from '@common/interfaces';
import { BehaviorSubject, firstValueFrom, Observable, Subject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class CombatService implements OnDestroy {
    choicePopUp = new EventEmitter<void>();
    cancelEscapes = new EventEmitter<void>();
    escapeAttemptsUpdated = new EventEmitter<{ playerId: string }>();
    diceRoll = new EventEmitter<CombatUpdate>();
    private _combatInitiator: Player | undefined = undefined;
    private _attackedPlayer: Player | undefined = undefined;
    private _combatWinner = new BehaviorSubject<string | undefined>(undefined);
    private _combatUpdateData: CombatUpdate | undefined;
    private _gameRoomPlayers: Player[] | undefined;
    private _isInCombat = false;
    private _animationComplete = new Subject<void>();

    constructor(
        private playerService: PlayerService,
        private socketService: SocketService,
        private turnService: TurnService,
        private alertService: AlertService,
        private injector: Injector,
    ) {
        this.init();
    }

    get combatInitiator() {
        return this._combatInitiator;
    }
    get attackedPlayer() {
        return this._attackedPlayer;
    }
    get combatUpdateData() {
        return this._combatUpdateData;
    }
    get animationComplete$(): Observable<void> {
        return this._animationComplete.asObservable();
    }
    private get actionService(): ActionService {
        return this.injector.get(ActionService);
    }

    set combatInitiator(combatInitiator: Player | undefined) {
        this._combatInitiator = combatInitiator;
    }

    set attackedPlayer(attackedPlayer: Player | undefined) {
        this._attackedPlayer = attackedPlayer;
    }

    notifyAnimationComplete(): void {
        this._animationComplete.next();
    }

    updateEscapeAttempts(playerId: string | undefined) {
        if (playerId) {
            this.escapeAttemptsUpdated.emit({ playerId });
        }
    }

    getCombatWinner() {
        return this._combatWinner.asObservable();
    }

    sendCombatAction(roomId: string, player: Player, action: Actions.Attack | Actions.Escape) {
        this.socketService.sendMessage(ActiveGameEvents.CombatAction, { playerId: player.id, action, roomId } as CombatAction);
    }

    sendCombatInit(roomId: string, player: Player, action: Actions) {
        const defender = this._attackedPlayer;
        this.socketService.sendMessage(ActiveGameEvents.CombatStarted, { playerId: player.id, action, roomId, target: defender } as PlayerAction);
    }

    async onCombatUpdate() {
        this.socketService.on<CombatUpdate>(ActiveGameEvents.CombatUpdate, async (data) => {
            this.diceRoll.emit(data);
            const startingPlayer = data.gameState?.combat?.turn;
            this._combatUpdateData = data;

            if (data.message === CombatResults.AttackNotDefeated) {
                await firstValueFrom(this.animationComplete$);
            }

            if (data.message === CombatResults.EscapeFailed) {
                this.updateEscapeAttempts(startingPlayer);
                if (startingPlayer === this.playerService.player.id) {
                    this.choicePopUp.emit();
                }
            } else if (startingPlayer === this.playerService.player.id) {
                this.choicePopUp.emit();
            }

            const playerHasMaxEscapeAttempts = data.gameState?.players?.some(
                (player) => player.id === this.playerService.player.id && player.escapeAttempts === 0,
            );

            if (playerHasMaxEscapeAttempts) {
                this.cancelEscapes.emit();
            }
            if (data.message === CombatResults.AttackDefeated || data.message === CombatResults.EscapeSucceeded) {
                await this.combatEnded(data);
            }
        });
    }

    onCombatStarted() {
        this.socketService.on<CombatUpdate>(ActiveGameEvents.CombatInitiated, (data) => {
            this._isInCombat = true;
            this._combatUpdateData = data;
            const startingPlayer = data.gameState?.combat?.turn;
            const players = data.gameState?.players as Player[];
            const combatInitiator = data.gameState?.combat?.attacker;
            this._combatInitiator = players.find((player) => player.id === combatInitiator);
            const attackedPlayer = data.gameState?.combat?.defender;
            this._attackedPlayer = players.find((player) => player.id === attackedPlayer);
            if (players && this.playerService.player.id) {
                const isPlayerInGame = players.some((player) => player.id === this.playerService.player.id);

                if (isPlayerInGame) {
                    this.actionService.onCombatStart.emit();
                    this.diceRoll.emit(data);
                }

                if (startingPlayer === this.playerService.player.id) {
                    setTimeout(() => {
                        this.choicePopUp.emit();
                    }, 0);
                }
            }
        });
    }

    onPlayerDisconnect() {
        this.socketService.on<GameDisconnect>(ActiveGameEvents.PlayerDisconnect, (data) => {
            if (!this._isInCombat) return;
            const combatData = this._combatUpdateData as CombatUpdate;
            this.fetchPlayers(this.playerService.getPlayers())
                .then(() => {
                    const disconnectedPlayerId = data.playerId;
                    const players = combatData.gameState?.players as Player[];
                    const isPlayerInGame = players.some((player) => player.id === disconnectedPlayerId);
                    const combatWinner = players.find((player) => player.id !== disconnectedPlayerId) as Player;
                    const roomPlayers = this._gameRoomPlayers as Player[];

                    if (isPlayerInGame && roomPlayers.length >= 2) {
                        this.handleCombatWinnerDisconnect(combatWinner);
                    }
                    this.endCombat();
                })
                .catch(() => {
                    return;
                });
        });
    }

    async combatEnded(data: CombatUpdate) {
        this.combatEndReset();
        const players = data.gameState?.players as Player[];
        const isPlayerInGame = players.some((player) => player.id === this.playerService.player.id);
        const winner = data.gameState?.players[0] as Player;
        if (data.message === CombatResults.AttackDefeated) {
            this.actionService.onCombatEnded.emit();
            this.turnService.unfreezeTurn(false);
            if (isPlayerInGame) {
                this.handleCombatWinner(winner, data);
            }
        } else if (data.message === CombatResults.EscapeSucceeded) {
            this.escapeSucceedScenario();
        }
    }

    async checkTurn(data: CombatUpdate) {
        const currentTurn = (await firstValueFrom(this.turnService.getCurrentTurn())) as Player;
        if (data.gameState?.players[0]?.id !== currentTurn?.id) {
            this.turnService.nextTurn();
        }
    }

    async fetchPlayers(playerObservable: Observable<Player[]>) {
        this._gameRoomPlayers = await firstValueFrom(playerObservable);
    }

    setupCombatWinnerListener() {
        this.socketService.on<CombatUpdate>(ActiveGameEvents.CombatUpdate, (data) => {
            if (data.message === CombatResults.AttackDefeated) {
                const winnerId = data.gameState?.players[0].id;
                this._combatWinner.next(winnerId);
            }
        });
    }

    ngOnDestroy(): void {
        this.turnOffListeners();
    }
    private init() {
        this.setupCombatWinnerListener();
        this.onCombatStarted();
        this.onCombatUpdate();
        this.onPlayerDisconnect();
    }

    private turnOffListeners() {
        this.socketService.off(ActiveGameEvents.CombatInitiated);
        this.socketService.off(ActiveGameEvents.CombatUpdate);
        this.socketService.off(ActiveGameEvents.PlayerDisconnect);
    }

    private handleCombatWinnerDisconnect(combatWinner: Player) {
        if (this.playerService.player.id === combatWinner.id) {
            this.actionService.onCombatEnded.emit();
            this.alertService.announceWinner('VOUS AVEZ GAGNE LE COMBAT');
        } else {
            this.alertService.announceWinner(`Gagnant du combat est: ${combatWinner.name}`);
        }
        this._combatWinner.next(combatWinner.id);
    }

    private endCombat() {
        this.turnService.unfreezeTurn(false);
        this._combatUpdateData = undefined;
        this._gameRoomPlayers = undefined;
        if (this.actionService.hasActionLeftSubject.getValue()) {
            this.actionService.hasActionLeftSubject.next(false);
        }
    }

    private async handleCombatWinner(winner: Player, data: CombatUpdate) {
        if ((winner.victories as number) <= 2) {
            if (this.playerService.player.id === winner.id) {
                this.alertService.announceWinner('VOUS AVEZ GAGNE LE COMBAT');
            } else {
                this.alertService.announceWinner(`Gagnant du combat est: ${winner.name}`);
            }
            await this.checkTurn(data);
            if (this.actionService.hasActionLeftSubject.getValue()) {
                this.actionService.hasActionLeftSubject.next(false);
            }
        }
    }
    private combatEndReset() {
        this._combatInitiator = undefined;
        this._attackedPlayer = undefined;
        this._combatUpdateData = undefined;
        this._isInCombat = false;
    }

    private escapeSucceedScenario() {
        this.actionService.onCombatEnded.emit();
        this.turnService.unfreezeTurn(false);
        if (this.actionService.hasActionLeftSubject.getValue()) {
            this.actionService.hasActionLeftSubject.next(false);
        }
    }
}
