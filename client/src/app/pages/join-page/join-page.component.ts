import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PlayerService } from '@app/services/player/player.service';
import { Routes } from '@app/enums/routes-enums';

@Component({
    selector: 'app-join-page',
    templateUrl: './join-page.component.html',
    styleUrls: ['./join-page.component.scss'],
    standalone: true,
    imports: [FormsModule],
})
export class JoinPageComponent {
    roomId: string = '';

    constructor(
        private playerService: PlayerService,
        private router: Router,
    ) {}
    isValidCode(): boolean {
        return /^\d{4}$/.test(this.roomId);
    }

    async onSubmit() {
        if (this.isValidCode()) {
            this.playerService.validateRoomId(this.roomId).then((response) => {
                if (response) {
                    this.playerService.joinGame(response, false);
                    this.router.navigate([Routes.Stats]).then();
                }
            });
        }
    }
}
