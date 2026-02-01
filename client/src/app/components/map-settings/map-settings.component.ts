import { Component, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatTooltip } from '@angular/material/tooltip';
import { GameSizes } from '@common/enums';
import { Routes } from '@app/enums/routes-enums';

@Component({
    selector: 'app-map-settings',
    standalone: true,
    templateUrl: './map-settings.component.html',
    styleUrls: ['./map-settings.component.scss'],
    imports: [FormsModule, MatTooltip],
})
export class MapSettingsComponent {
    gameMode: string = 'Classic';
    mapSize: number = GameSizes.Small;

    constructor(private router: Router) {}

    @HostListener('document:keydown.enter', ['$event'])
    onSubmit() {
        sessionStorage.clear();
        const gameToEdit = { gridSize: this.mapSize, gameMode: this.gameMode };
        sessionStorage.setItem('gameToEdit', JSON.stringify(gameToEdit));
        this.router.navigate([Routes.MapEditor]);
    }
}
