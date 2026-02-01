import { ActiveGameEvents } from '@common/gateway-events';
import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { TurnService } from '@app/services/turn/turn-service';
import { PlayerService } from '@app/services/player/player.service';
import { SocketService } from '@app/services/socket/socket.service';
import { ActiveGridService } from '@app/services/active-grid/active-grid.service';
import { Grid, GameDisconnect } from '@common/interfaces';
import { Subject, takeUntil } from 'rxjs';
import { DebugComponent } from '@app/components/debug/debug.component';

@Component({
    selector: 'app-game-info',
    imports: [CommonModule, DebugComponent],
    templateUrl: './game-info.component.html',
    styleUrls: ['./game-info.component.scss'],
    standalone: true,
})
export class GameInfoComponent implements OnInit, OnDestroy {
    private _playerNameTurn: string | undefined;
    private _grid: Grid;
    private _numberOfPlayers: number = 0;
    private _destroy$ = new Subject<void>();

    constructor(
        private turnService: TurnService,
        private activeGridService: ActiveGridService,
        private playerService: PlayerService,
        private socketService: SocketService,
    ) {}

    get playerNameTurn() {
        return this._playerNameTurn;
    }

    get numberOfPlayers() {
        return this._numberOfPlayers;
    }

    get grid() {
        return this._grid;
    }

    ngOnInit(): void {
        this.activeGridService.gridSubject.pipe(takeUntil(this._destroy$)).subscribe((grid) => {
            if (grid) {
                this._grid = grid;
            }
        });
        this.playerService
            .getPlayers()
            .pipe(takeUntil(this._destroy$))
            .subscribe({
                next: (players) => {
                    this._numberOfPlayers = players.length;
                },
            });

        this.socketService.on<GameDisconnect>(ActiveGameEvents.PlayerDisconnect, () => {
            this._numberOfPlayers--;
        });

        this.turnService
            .getCurrentTurn()
            .pipe(takeUntil(this._destroy$))
            .subscribe({
                next: (playerWithTurn) => {
                    if (playerWithTurn) {
                        this._playerNameTurn = playerWithTurn.name;
                    }
                },
            });
    }

    ngOnDestroy() {
        this.socketService.off(ActiveGameEvents.PlayerDisconnect);
        this._destroy$.next();
        this._destroy$.complete();
    }
}
