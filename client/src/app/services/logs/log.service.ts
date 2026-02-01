import { Injectable, OnDestroy } from '@angular/core';
import { GameModeService } from '@app/services/game-mode/game-mode.service';
import { PlayerService } from '@app/services/player/player.service';
import { SocketService } from '@app/services/socket/socket.service';
import { WINNING_CONDITION } from '@common/constants';
import { CombatResults, ItemId } from '@common/enums';
import { ActiveGameEvents, CTFEvents, DebugEvents } from '@common/gateway-events';
import { CombatUpdate, DebugResponse, FlagHolderPayload, GameDisconnect, ItemUpdate, Log, Player, ToggleDoor, TurnUpdate } from '@common/interfaces';
import { newDate } from '@common/shared-utils';
import { BehaviorSubject, Observable, take } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class LogService implements OnDestroy {
    private _logs = new BehaviorSubject<Log[]>([]);
    private _remainingPlayers = new BehaviorSubject<Player[]>([]);
    private _allLogs: Log[] = [];
    private _areLogsFiltered: boolean = false;

    constructor(
        private socketService: SocketService,
        private playerService: PlayerService,
        private gameModeService: GameModeService,
    ) {
        this.playerService
            .getPlayers()
            .pipe(take(1))
            .subscribe((players) => {
                this._remainingPlayers.next(players);
            });
    }

    get logs(): Observable<Log[]> {
        return this._logs.asObservable();
    }

    ngOnDestroy(): void {
        this.socketService.off(ActiveGameEvents.ItemPickedUp);
        this.socketService.off(ActiveGameEvents.CombatUpdate);
        this.socketService.off(ActiveGameEvents.NextTurn);
        this.socketService.off(ActiveGameEvents.PlayerDisconnect);
        this.socketService.off(ActiveGameEvents.CombatInitiated);
        this.socketService.off(ActiveGameEvents.DoorUpdate);
        this.socketService.off(CTFEvents.FlagTaken);
        this.socketService.off(CTFEvents.FlagCaptured);
    }

    filterLogs() {
        if (this._areLogsFiltered) {
            this._logs.next(this._allLogs);
            this._areLogsFiltered = false;
            return;
        }

        const playerId = this.playerService?.player?.id;

        this._logs.next(this._allLogs.filter((log) => log?.defendingPlayer?.id === playerId || log?.message?.player?.id === playerId));

        this._areLogsFiltered = true;
    }

    setupListeners() {
        this.socketService.on<CombatUpdate>(ActiveGameEvents.CombatInitiated, (data) => {
            this.addLog(this.createNewLog(`Combat initié par ${data.gameState?.players[0].name} avec ${data.gameState?.players[1].name}.`));
        });
        this.socketService.on<CombatUpdate>(ActiveGameEvents.CombatUpdate, (data) => {
            this.handleCombatUpdate(data);
        });

        this.socketService.on<ItemUpdate>(ActiveGameEvents.ItemPickedUp, (data) => {
            if (data.item?.id === ItemId.ItemFlag) return;
            const player = this._remainingPlayers.value.find((playerToFind) => playerToFind.id === data.playerId);
            this.addLog(this.createNewLog(`${player?.name} a ramassé un item!`, player));
        });

        this.socketService.on<TurnUpdate>(ActiveGameEvents.TurnUpdate, (data) => {
            this.addLog(this.createNewLog(`C'est le tour de ${data.player.name}.`, data.player));
        });

        this.socketService.on<GameDisconnect>(ActiveGameEvents.PlayerDisconnect, (data) => {
            const quittingPlayer = this._remainingPlayers.value.find((player) => player.id === data.playerId);
            this._remainingPlayers.next(data.remainingPlayers as Player[]);
            this.addLog(this.createNewLog(`${quittingPlayer?.name} s'est déconnecté.`, quittingPlayer));
        });

        this.socketService.on<ToggleDoor>(ActiveGameEvents.DoorUpdate, (data) => {
            this.addLog(this.createNewLog(`Porte ${data.isOpened ? 'ouverte' : 'fermée'} par ${data.player?.name}`, data.player));
        });

        this.socketService.on<DebugResponse>(DebugEvents.ToggleDebug, (response) => {
            this.addLog(this.createNewLog(`Mode débug ${response.isDebug ? 'activé' : 'désactivé'}.`));
        });

        this.socketService.on<FlagHolderPayload>(CTFEvents.FlagTaken, (data) => {
            this.addLog(this.createNewLog(`${data.flagHolder.name} a pris le drapeau !`));
        });
        this.socketService.on(CTFEvents.FlagCaptured, () => {
            this.endGameLog();
        });
    }

    private addLog(log: Log) {
        this._allLogs.push(log);
        if (!this._areLogsFiltered) {
            this._logs.next([...this._logs.value, log]);
        }
    }

    private handleCombatUpdate(combat: CombatUpdate): void {
        const players = combat.gameState?.players;
        if (!players) return;
        const attacker = combat.gameState?.players.find((player) => combat.gameState?.combat?.attacker === player.id) as Player;
        const defender = combat.gameState?.players.find((player) => combat.gameState?.combat?.defender === player.id) as Player;
        const [winner, loser] = [combat.gameState?.players[0], combat.gameState?.players[1]] as [Player, Player];

        switch (combat.message) {
            case CombatResults.AttackDefeated: {
                this.attackType(winner, loser, players, combat);
                this.fightEnded(winner, loser);
                break;
            }

            case CombatResults.AttackNotDefeated: {
                this.attackType(attacker, defender, players, combat);
                break;
            }

            case CombatResults.EscapeSucceeded:
                this.escapeSucceeded(winner, loser, players);
                break;

            case CombatResults.EscapeFailed:
                this.escapeFailed(attacker, defender, players);
                break;
        }
    }

    private fightEnded(winner: Player, loser: Player) {
        this.addLog(this.createNewLog(`Fin du combat. ${winner.name} a gagné. ${loser.name} a perdu.`, winner, loser));
        if ((winner.victories as number) >= WINNING_CONDITION && !this.gameModeService.isCtf()) {
            this.endGameLog();
        }
    }

    private escapeSucceeded(winner: Player, loser: Player, players: Player[]) {
        if (this.playerService.player.id === winner.id || this.playerService.player.id === loser.id) {
            this.addLog(this.createNewLog(`${winner.name} tente de fuir ${loser.name}!`, players[0], players[1]));
        }
        this.addLog(this.createNewLog(`${winner.name} a fui ${loser.name}!`, players[0], players[1]));
    }

    private escapeFailed(attacker: Player, defender: Player, players: Player[]) {
        if (this.playerService.player.id !== attacker.id && this.playerService.player.id !== defender.id) return;
        this.addLog(this.createNewLog(`${attacker.name} tente de fuir ${defender.name}!`, players[0], players[1]));
        this.addLog(this.createNewLog(`${attacker.name} n'a pas pu fuir ${defender.name}!`, players[0], players[1]));
    }
    private attackType(attacker: Player, defender: Player, players: Player[], combat: CombatUpdate) {
        if (this.playerService.player.id !== attacker.id && this.playerService.player.id !== defender.id) return;
        this.addLog(this.createNewLog(`${attacker.name} a attaqué ${defender.name}!`, players[0], players[1]));

        this.addLog(
            this.createNewLog(
                `${attacker.name} a roulé un ${combat.finalDice ? combat.finalDice.attack : combat.diceAttack},
                ${defender.name} a roulé ${combat.finalDice ? combat.finalDice.defense : combat.diceDefense}`,
                players[0],
                players[1],
            ),
        );
    }

    private endGameLog() {
        const names = this._remainingPlayers.value.map((player) => player.name).join(', ');
        this.addLog(this.createNewLog(`Fin de la partie. Merci à ${names} d'avoir participé à la partie !`));
    }

    private createNewLog(message: string, player1?: Player, player2?: Player): Log {
        return {
            message: {
                player: player1 as Player,
                time: newDate(),
                message,
            },
            defendingPlayer: player2,
        };
    }
}
