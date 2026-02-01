import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardsComponent } from '@app/components/game-creation-cards/cards.component';
import { AdminService } from '@app/services/admin-service/admin-service';
import { Game } from '@common/types';
@Component({
    selector: 'app-game-creation-page',
    imports: [CardsComponent, RouterLink],
    standalone: true,
    templateUrl: './game-creation-page.component.html',
    styleUrl: './game-creation-page.component.scss',
})
export class GameCreationPageComponent implements OnInit {
    cards: Game[] = [];

    constructor(private adminService: AdminService) {}

    ngOnInit(): void {
        this.loadGames();
    }

    loadGames(): void {
        this.adminService.getAllGames().subscribe({
            next: (games: Game[]) => {
                this.cards = games.filter((game) => !game.isHidden);
            },
            error: () => {
                this.cards = [];
            },
        });
    }
}
