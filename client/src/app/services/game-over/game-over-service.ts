import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ActiveGridService } from '@app/services/active-grid/active-grid.service';
import { AlertService } from '@app/services/alert/alert.service';
import { GameModeService } from '@app/services/game-mode/game-mode.service';
import { SocketService } from '@app/services/socket/socket.service';
import { TurnService } from '@app/services/turn/turn-service';
import { SNACKBAR_TIME, WINNING_CONDITION } from '@common/constants';
import { CombatResults, GameModes } from '@common/enums';
import { ActiveGameEvents } from '@common/gateway-events';
import { CombatUpdate, GameStats, GlobalStats, NoMorePlayerPayload, Player } from '@common/interfaces';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
import { Routes } from '@app/enums/routes-enums';

@Injectable({
    providedIn: 'root',
})
export class GameOverService {
    gameStats: GameStats;
    private _isVictory: boolean = false;
    private _gameOverSubject = new BehaviorSubject<ActiveGameEvents | undefined>(undefined);
    private _winnerSubject = new BehaviorSubject<Player | undefined>(undefined);
    private _destroy$ = new Subject<void>();
    private alertService = inject(AlertService);

    constructor(
        private socketService: SocketService,
        private router: Router,
        private turnService: TurnService,
        private activeGridService: ActiveGridService,
        private gameModeService: GameModeService,
    ) {}

    init() {
        this.listenForNoMorePlayers();
        this.listenForWinner();
        this.listenForGameEnded();
    }

    cleanup() {
        this.turnOffListeners();
        this.resetGameOverState();
        this._isVictory = false;
    }

    getGameOverStatus() {
        return this._gameOverSubject.asObservable();
    }

    getWinner() {
        return this._winnerSubject.asObservable();
    }

    handleGameOver(isGameOver: ActiveGameEvents | undefined, winner: Player | undefined, currentPlayer: Player) {
        if (isGameOver === ActiveGameEvents.NoMorePlayers) {
            this.noMorePlayers();
            return;
        }

        if (isGameOver === ActiveGameEvents.CombatUpdate && winner) {
            this.gameOver(winner, currentPlayer);
            return;
        }
    }

    turnOffListeners() {
        this.socketService.off(ActiveGameEvents.CombatUpdate);
        this.socketService.off(ActiveGameEvents.NoMorePlayers);
        this.socketService.off(ActiveGameEvents.GameEnded);
        this._destroy$.next();
        this._destroy$.complete();
    }

    private resetGameOverState() {
        this._gameOverSubject.next(undefined);
        this._winnerSubject.next(undefined);
    }

    private listenForNoMorePlayers() {
        this.socketService.on<NoMorePlayerPayload>(ActiveGameEvents.NoMorePlayers, () => {
            this._gameOverSubject.next(ActiveGameEvents.NoMorePlayers);
        });
    }

    private listenForWinner() {
        if (this.gameModeService.gameMode === GameModes.Classic) {
            this.socketService.on<CombatUpdate>(ActiveGameEvents.CombatUpdate, (data) => {
                if (data.message === CombatResults.AttackDefeated) {
                    const winner = data.gameState?.players[0];
                    this._winnerSubject.next(winner);
                    this._gameOverSubject.next(ActiveGameEvents.CombatUpdate);
                }
            });
        } else {
            this.gameModeService.winningTeamSubject.pipe(takeUntil(this._destroy$)).subscribe((team) => {
                if (team.length !== 0) {
                    if (team.some((player) => player.id === this.turnService.playerId)) {
                        this.alertService.announceWinner('VOUS AVEZ GAGNÉ!!!');
                    } else {
                        const winners = team.map((player) => player.name).join(', ');
                        this.alertService.announceWinner(
                            team.length === 1 ? `Partie terminée, le gagnant est: ${winners}` : `Partie terminée, les gagnants sont: ${winners}`,
                        );
                    }
                    this.handleGameEnd();
                }
            });
        }
    }
    private gameOver(winner: Player, currentPlayer: Player) {
        if (winner?.victories && winner.victories >= WINNING_CONDITION) {
            this.socketService.sendMessage(ActiveGameEvents.FetchStats, {
                roomId: this.activeGridService.roomId,
                grid: this.activeGridService.gridSubject.getValue(),
            });
            this._isVictory = true;
            if (currentPlayer.id === winner.id) {
                this.alertService.announceWinner('VOUS AVEZ GAGNÉ!!!');
            } else {
                this.alertService.announceWinner(`Partie terminée, le gagnant est: ${winner.name}!`);
            }
            this.handleGameEnd();
        }
    }
    private noMorePlayers() {
        if (this._isVictory) return;
        this.resetGameOverState();
        this.socketService.disconnect();
        setTimeout(() => {
            this.alertService.alert('Vous avez été déconnecté, vous étiez le dernier joueur!');
        }, 1);
        return;
    }
    private listenForGameEnded() {
        this.socketService.on<GameStats>(ActiveGameEvents.GameEnded, (data) => {
            this.gameStats = {
                players: data.players || [],
                globalStats: this.sanitizeGlobalStats(data.globalStats),
            };
            setTimeout(() => {
                localStorage.setItem('gameStats', JSON.stringify(this.gameStats));
                this.router.navigate([Routes.End]);
            }, SNACKBAR_TIME);
        });
    }

    private handleGameEnd() {
        this.socketService.sendMessage(ActiveGameEvents.FetchStats, {
            roomId: this.activeGridService.roomId,
            grid: this.activeGridService.gridSubject.getValue(),
        });
        this.turnService.removeListeners();
        this.activeGridService.deselectPlayer();
        this.turnService.freezeTurn();
    }

    private sanitizeGlobalStats(globalStats?: Partial<GlobalStats>): GlobalStats {
        return {
            duration: globalStats?.duration || 0,
            totalTurns: globalStats?.totalTurns || 0,
            doorsUsed: globalStats?.doorsUsed || [],
            doorsUsedPercent: globalStats?.doorsUsedPercent || 0,
            tilesVisited: globalStats?.tilesVisited || [],
            tilesVisitedPercentage: globalStats?.tilesVisitedPercentage || 0,
            flagHolders: globalStats?.flagHolders || [],
        };
    }
}
