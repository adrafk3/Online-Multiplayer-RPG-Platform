import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PlayerService } from '@app/services/player/player.service';
import { Routes } from '@app/enums/routes-enums';

@Component({
    selector: 'app-player-name-selection',
    imports: [FormsModule],
    standalone: true,
    templateUrl: './player-name-selection.component.html',
    styleUrl: './player-name-selection.component.scss',
})
export class PlayerNameSelectionComponent {
    @Input() isVisible: boolean = true;
    @Output() isVisibleChange = new EventEmitter<boolean>();
    backGround: string = 'assets/creation_cards_back_ground.png';
    username: string = '';

    constructor(
        private playerService: PlayerService,
        private router: Router,
    ) {}

    validateUsername(): boolean {
        return Boolean(this.username.trim());
    }

    xButtonClick() {
        this.isVisible = false;
        this.isVisibleChange.emit(this.isVisible);
    }
    async validateButtonClick() {
        this.isVisible = false;
        this.isVisibleChange.emit(this.isVisible);
        this.playerService.player.name = this.username;
        if (this.username.toLowerCase() === 'knuckles') this.playerService.player.avatar = 'Knuckles';
        this.playerService.validateRoomId().then((response) => {
            if (response) {
                this.playerService.selectAvatar();
                this.router.navigate([`${Routes.Stats}/`, response]).then();
            }
        });
    }

    preventEnter(event: Event): void {
        const keyboardEvent = event as KeyboardEvent;
        if (!this.validateUsername() && keyboardEvent.key === 'Enter') {
            event.preventDefault();
        }
    }
}
