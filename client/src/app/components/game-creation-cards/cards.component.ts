import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminService } from '@app/services/admin-service/admin-service';
import { AlertService } from '@app/services/alert/alert.service';
import { PlayerService } from '@app/services/player/player.service';
import { GameModes, GameSizes, Players } from '@common/enums';
import { HttpMessage } from '@common/http-message';
import { Game } from '@common/types';
import { Subject, takeUntil } from 'rxjs';
import { GameModeService } from '@app/services/game-mode/game-mode.service';

@Component({
    selector: 'app-cards',
    imports: [MatTooltipModule],
    standalone: true,
    templateUrl: './cards.component.html',
    styleUrl: './cards.component.scss',
})
export class CardsComponent implements OnInit, OnDestroy {
    @Input() gameData!: Game;
    @Output() gameUpdated = new EventEmitter<void>();

    playersIcon: string = 'assets/players.png';
    cardBackGround: string = 'assets/creation_cards_back_ground.png';
    private _gameModeImage: string;
    private _maxPlayers: number;
    private destroy$ = new Subject<void>();

    constructor(
        private adminService: AdminService,
        private playerService: PlayerService,
        private alertService: AlertService,
        private gameModeService: GameModeService,
    ) {}

    get maxPlayers(): number {
        return this._maxPlayers;
    }
    get gameModeImage(): string {
        return this._gameModeImage;
    }
    set maxPlayers(value: number) {
        this._maxPlayers = value;
    }

    ngOnInit(): void {
        this._gameModeImage = this.getGameModeImage(this.gameData.gameMode);
        this.maxPlayers = this.getMaxPlayers(this.gameData.gridSize);
    }
    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    getGameModeImage(gameMode: string): string {
        switch (gameMode) {
            case GameModes.CTF:
                return 'assets/ctf.png';
            case GameModes.Classic:
                return 'assets/classic.png';
            default:
                return 'assets/classic.png';
        }
    }

    getMaxPlayers(size: number): number {
        switch (size) {
            case GameSizes.Small:
                return Players.SmallMap;
            case GameSizes.Medium:
                return Players.MediumMap;
            case GameSizes.Big:
                return Players.BigMap;
            default:
                return Players.SmallMap;
        }
    }
    onCardClick(): void {
        this.adminService
            .getGameById(this.gameData._id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (game) => {
                    if (game.isHidden) {
                        this.alertService.alert("Le jeu n'est plus visible.");
                        this.gameUpdated.emit();
                    } else {
                        this.playerService.createGame(game._id);
                        this.gameModeService.gameMode = game.gameMode as GameModes;
                    }
                },
                error: (err) => {
                    if (err.status === HttpMessage.NotFound) {
                        this.alertService.alert("Le jeu n'existe plus.");
                        this.gameUpdated.emit();
                    } else {
                        this.alertService.alert(err);
                    }
                },
            });
    }
}
