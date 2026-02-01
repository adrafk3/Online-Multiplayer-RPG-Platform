import { Component } from '@angular/core';
import { DescriptionComponent } from '@app/components/description/description.component';
import { GameGridComponent } from '@app/components/game-grid/game-grid.component';
import { ItemBarComponent } from '@app/components/item-bar/item-bar.component';
import { TileBarComponent } from '@app/components/tile-bar/tile-bar.component';
import { GridService } from '@app/services/grid-service/grid-service.service';

@Component({
    selector: 'app-game-page',
    templateUrl: './editor-page.component.html',
    styleUrls: ['./editor-page.component.scss'],
    imports: [DescriptionComponent, TileBarComponent, ItemBarComponent, GameGridComponent],
    standalone: true,
})
export class EditorPageComponent {
    isSaving: boolean = false;

    constructor(private gridService: GridService) {}

    onMouseMove(event: MouseEvent) {
        this.gridService.onMouseMove(event);
    }

    onDragEnd(event: DragEvent) {
        this.gridService.onDragEnd(event);
    }

    onContextMenu(event: MouseEvent) {
        this.gridService.onContextMenu(event);
    }

    onMouseUp(event: MouseEvent) {
        this.gridService.onMouseUp(event);
    }

    onMouseDown(event: MouseEvent) {
        this.gridService.onMouseDown(event);
    }

    toggleIsSaving(newValue: boolean) {
        this.isSaving = newValue;
    }
}
