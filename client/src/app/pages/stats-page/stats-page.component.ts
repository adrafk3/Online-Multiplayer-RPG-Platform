import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AvatarIconComponent } from '@app/components/avatar-icon/avatar-icon.component';
import { CharacterStatsComponent } from '@app/components/character-stats/character-stats.component';
import { PlayerNameSelectionComponent } from '@app/components/player-name-selection/player-name-selection.component';
import { PlayerService } from '@app/services/player/player.service';
import { SocketService } from '@app/services/socket/socket.service';
import { Avatar, AVATARS } from '@common/avatar';
import { SelectedAvatars } from '@common/interfaces';
import { MatTooltip } from '@angular/material/tooltip';
import { GameRoomEvents } from '@common/gateway-events';
import { Routes } from '@app/enums/routes-enums';

@Component({
    selector: 'app-stats-page',
    imports: [CommonModule, AvatarIconComponent, CharacterStatsComponent, PlayerNameSelectionComponent, MatTooltip],
    standalone: true,
    templateUrl: './stats-page.component.html',
    styleUrl: './stats-page.component.scss',
})
export class StatsPageComponent implements OnInit, OnDestroy {
    @Input() selectedAvatar: Avatar;
    avatars = AVATARS.map((avatar) => ({ ...avatar, isAvailable: true }));
    isValid: boolean = false;
    showUsernameInput: boolean = false;
    private currentPlayerAvatar: string;
    private initialSelectionMade = false;

    constructor(
        private playerService: PlayerService,
        private socketService: SocketService,
        private router: Router,
    ) {}

    ngOnInit(): void {
        if (this.playerService.roomId !== '' && this.playerService.player.name === '') {
            this.setupRoomUpdateListener();
            this.playerService.updateAvatars();
        } else {
            this.router.navigate([Routes.Home]).then(() => this.socketService.disconnect());
        }
    }

    ngOnDestroy() {
        this.socketService.off(GameRoomEvents.AvatarUpdate);
    }

    onIsValidChange(isValid: boolean) {
        this.isValid = isValid;
    }

    validateStats() {
        if (this.isValid) {
            this.showUsernameInput = true;
        }
    }

    onUsernameVisibilityChange(isVisible: boolean) {
        this.showUsernameInput = isVisible;
    }

    onAvatarSelected(avatar: Avatar) {
        this.socketService.sendMessage(GameRoomEvents.AvatarUpdate, {
            roomId: this.playerService.roomId,
            nextAvatar: avatar.name,
        });
        this.currentPlayerAvatar = avatar.name;
        this.selectedAvatar = avatar;
    }

    isAvailable(avatar: Avatar): boolean {
        if (avatar.name === this.currentPlayerAvatar) return true;

        const foundAvatar = this.avatars.find((a) => a.name === avatar.name);
        return foundAvatar ? foundAvatar.isAvailable : false;
    }

    private setupRoomUpdateListener() {
        this.socketService.on<SelectedAvatars>(GameRoomEvents.AvatarUpdate, (data) => {
            this.updateAvatarsAvailability(data.selectedAvatars);

            if (!this.initialSelectionMade) {
                this.makeInitialSelection();
                this.initialSelectionMade = true;
            } else {
                this.selectFirstAvailableAvatar();
            }
        });
    }

    private makeInitialSelection() {
        const availableAvatar = this.avatars.find((avatar) => avatar.isAvailable) || AVATARS[0];
        this.selectedAvatar = availableAvatar;
        this.currentPlayerAvatar = availableAvatar.name;
        this.playerService.player.avatar = this.currentPlayerAvatar;
        this.socketService.sendMessage(GameRoomEvents.AvatarUpdate, {
            roomId: this.playerService.roomId,
            nextAvatar: this.currentPlayerAvatar,
        });
    }

    private updateAvatarsAvailability(selectedAvatars: string[]) {
        this.avatars.forEach((avatar) => {
            if (avatar.name === this.currentPlayerAvatar) {
                avatar.isAvailable = true;
            } else {
                avatar.isAvailable = !selectedAvatars.includes(avatar.name);
            }
        });
    }

    private selectFirstAvailableAvatar() {
        if (!this.isAvailable(this.selectedAvatar)) {
            const newAvatar = this.avatars.find((avatar) => this.isAvailable(avatar)) || AVATARS[0];
            if (newAvatar.name !== this.selectedAvatar.name) {
                this.onAvatarSelected(newAvatar);
            }
        }
    }
}
