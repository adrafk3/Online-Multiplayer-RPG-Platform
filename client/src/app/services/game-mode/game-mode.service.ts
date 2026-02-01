import { Injectable } from '@angular/core';
import { GameModes } from '@common/enums';
import { FlagCapturedPayload, FlagHolderPayload, Player, Team, BoardCell } from '@common/interfaces';
import { PlayerService } from '@app/services/player/player.service';
import { ActiveGameEvents, CTFEvents } from '@common/gateway-events';
import { Position } from '@common/types';
import { SocketService } from '@app/services/socket/socket.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class GameModeService {
    private _gameMode: GameModes;
    private _teams: Team[] = [];
    private _flagGoal: Position | undefined;
    private _isFlagTaken: boolean;
    private _flagHolder: Player | undefined;
    private _winningTeamSubject = new BehaviorSubject<Player[]>([]);
    private _isInitialised = false;

    constructor(
        private playerService: PlayerService,
        private socketService: SocketService,
    ) {}

    get gameMode() {
        return this._gameMode;
    }
    get teams() {
        return this._teams;
    }
    get winningTeamSubject() {
        return this._winningTeamSubject;
    }
    get flagHolder() {
        return this._flagHolder;
    }
    set flagHolder(player: Player | undefined) {
        this._flagHolder = player;
    }
    set gameMode(mode: GameModes) {
        this._gameMode = mode;
    }

    onInit() {
        if (this._gameMode === GameModes.CTF && !this._isInitialised) {
            this.setUpCTFListeners();
            this._isInitialised = true;
        }
    }
    setTeams(teams: Player[][]): void {
        const team1: Team = {
            players: teams[0],
            isOwnTeam: teams[0].some((player) => player.id === this.playerService.player.id),
        };

        const team2: Team = {
            players: teams[1],
            isOwnTeam: teams[1].some((player) => player.id === this.playerService.player.id),
        };

        this._teams = [team1, team2];
    }

    canStartGame(numberOfPlayers?: number) {
        if (this._gameMode === GameModes.CTF && numberOfPlayers) {
            return numberOfPlayers % 2 === 0;
        } else {
            return true;
        }
    }

    getTeamNumber(playerId: string) {
        const team = this._teams[0];
        for (const player of team.players) {
            if (player.id === playerId) {
                return 1;
            }
        }
        return 2;
    }

    isPartOfOwnTeam(playerId: string) {
        return this._teams[this.getTeamNumber(playerId) - 1].isOwnTeam;
    }

    sendMap(map: BoardCell[][]) {
        this.socketService.sendMessage<{ roomId: string; map: BoardCell[][] }>(ActiveGameEvents.MapRequest, {
            roomId: this.playerService.roomId,
            map,
        });
    }

    makeStartingPointGlow(x: number, y: number) {
        return this._isFlagTaken && this._flagGoal && this._flagGoal.x === x && this._flagGoal.y === y;
    }

    showFlagHolder(player: Player | undefined) {
        if (!player) {
            return false;
        }
        return this._flagHolder?.id === player.id;
    }

    isCtf() {
        return this._gameMode === GameModes.CTF && this._teams.length !== 0;
    }

    onReset() {
        this.removeCTFListeners();
        this._teams = [];
        this._flagGoal = undefined;
        this._flagHolder = undefined;
        this._isFlagTaken = false;
        this._isInitialised = false;
        this._winningTeamSubject.next([]);
    }

    private setUpCTFListeners() {
        this.socketService.on<FlagHolderPayload>(CTFEvents.FlagTaken, (data) => {
            this._isFlagTaken = true;
            this._flagGoal = data.flagHolder.startingPoint;
            this._flagHolder = data.flagHolder;
        });
        this.socketService.on(CTFEvents.FlagDropped, () => {
            this._isFlagTaken = false;
            this._flagGoal = undefined;
            this._flagHolder = undefined;
        });
        this.socketService.on<FlagCapturedPayload>(CTFEvents.FlagCaptured, (data) => {
            this._isFlagTaken = false;
            this._winningTeamSubject.next(data.winningTeam);
        });
    }

    private removeCTFListeners() {
        this.socketService.off(CTFEvents.FlagTaken);
        this.socketService.off(CTFEvents.FlagDropped);
        this.socketService.off(CTFEvents.FlagCaptured);
    }
}
