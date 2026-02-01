import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CollapsibleMenuComponent } from '@app/components/collapsible-menu/collapsible-menu.component';
import { GameCardComponent } from '@app/components/game-card/game-card.component';
import { AdminService } from '@app/services/admin-service/admin-service';
import { Game } from '@common/types';
import { Routes } from '@app/enums/routes-enums';

@Component({
    selector: 'app-admin-page',
    templateUrl: './admin-page.component.html',
    styleUrls: ['./admin-page.component.scss'],
    standalone: true,
    imports: [CommonModule, RouterLink, GameCardComponent, CollapsibleMenuComponent],
})
export class AdminPageComponent implements OnInit {
    private games: Game[] = [];
    private _errorMessage: string = '';

    constructor(
        private adminService: AdminService,
        private router: Router,
    ) {}

    get errorMessage() {
        return this._errorMessage;
    }
    filteredGames(mode: string): Game[] {
        return this.games.filter((game) => game.gameMode === mode);
    }

    formatGame(game: Game): Game {
        return {
            ...game,
            lastModified: this.adminService.fixHour(game.lastModified),
        };
    }

    ngOnInit(): void {
        this.fetchGames();
        sessionStorage.clear();
    }

    fetchGames(): void {
        this.adminService.getAllGames().subscribe({
            next: (data) => {
                this.games = data;
            },
            error: (err) => {
                this._errorMessage = err;
            },
        });
    }

    onEditGame(id: string): void {
        const gameToEdit = this.games.find((game) => game._id === id);
        if (gameToEdit) {
            this.adminService.getGameById(id).subscribe({
                next: () => {
                    sessionStorage.setItem('gameToEdit', JSON.stringify(gameToEdit));
                    this.router.navigate([Routes.MapEditor]);
                },
                error: (err) => {
                    this._errorMessage = 'Error trying to edit game: ' + err.message;
                },
            });
        }
    }

    onHideGame(id: string): void {
        const gameToHide = this.games.find((game) => game._id === id);
        if (gameToHide) {
            gameToHide.isHidden = !gameToHide.isHidden;
            this.adminService.updateVisibility(id).subscribe({
                error: (err) => {
                    this._errorMessage = 'Error updating game visibility: ' + err.message;
                },
            });
        }
    }

    onDeleteGame(id: string): void {
        const gameToDelete = this.games.find((game) => game._id === id);
        const gameToDeleteIndex = this.games.findIndex((game) => game._id === id);
        if (gameToDelete) {
            this.games.splice(gameToDeleteIndex, 1);

            this.adminService.deleteGame(gameToDelete._id).subscribe({
                error: (err) => {
                    this._errorMessage = 'Error deleting game:' + err.message;
                    this.fetchGames();
                },
            });
        }
    }
}
