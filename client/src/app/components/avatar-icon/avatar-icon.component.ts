import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PlayerService } from '@app/services/player/player.service';
import { Avatar, AVATARS } from '@common/avatar';

@Component({
    selector: 'app-avatar-icon',
    imports: [],
    standalone: true,
    templateUrl: './avatar-icon.component.html',
    styleUrl: './avatar-icon.component.scss',
})
export class AvatarIconComponent {
    @Input() avatar: Avatar = AVATARS[0];
    @Input() isAvailable: boolean = true;
    @Input() isSelected: boolean = false;

    @Output() selected = new EventEmitter<void>();

    constructor(private playerService: PlayerService) {}
    onSelect(): void {
        this.playerService.player.avatar = this.avatar.name;
        this.selected.emit();
    }
}
