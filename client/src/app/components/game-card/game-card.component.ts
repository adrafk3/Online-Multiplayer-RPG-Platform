import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';
import { Game } from '@common/types';

@Component({
    selector: 'app-game-card',
    templateUrl: './game-card.component.html',
    styleUrls: ['./game-card.component.scss'],
    standalone: true,
    imports: [MatTooltip, MatTooltipModule],
})
export class GameCardComponent {
    @Input() game: Game;

    @Output() edit = new EventEmitter<void>();
    @Output() hide = new EventEmitter<void>();
    @Output() delete = new EventEmitter<void>();

    onEdit() {
        this.edit.emit();
    }

    onHide() {
        this.hide.emit();
    }

    onDelete() {
        this.delete.emit();
    }
}
