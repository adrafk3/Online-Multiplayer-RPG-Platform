import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { PlayerService } from '@app/services/player/player.service';
import { Routes } from '@app/enums/routes-enums';

@Component({
    selector: 'app-header',
    standalone: true,
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
    constructor(
        private router: Router,
        private playerService: PlayerService,
    ) {}

    goHome() {
        this.router.navigate([Routes.Home]).then(() => this.playerService.quitGame());
    }
}
