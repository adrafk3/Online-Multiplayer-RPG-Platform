import { NgOptimizedImage, NgStyle } from '@angular/common';
import { Component, EventEmitter, HostListener, OnDestroy, OnInit, Output } from '@angular/core';
import { MatTooltip } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { GridVerifier } from '@app/classes/grid-verifier/grid-verifier';
import { Html2CanvasWrapper } from '@app/classes/wrapper/wrappers';
import { AlertService } from '@app/services/alert/alert.service';
import { GridService } from '@app/services/grid-service/grid-service.service';
import { ItemService } from '@app/services/item/item.service';
import { ITEM_IMAGE_MAP, TILE_IMAGES } from '@common/constants';
import { ItemId, TileTypes } from '@common/enums';
import { BoardCell, Coords, DragStartEvent } from '@common/interfaces';
import { Subject, takeUntil } from 'rxjs';
import { Routes } from '@app/enums/routes-enums';

@Component({
    selector: 'app-game-grid',
    standalone: true,
    templateUrl: './game-grid.component.html',
    styleUrls: ['./game-grid.component.scss'],
    imports: [NgStyle, NgOptimizedImage, MatTooltip],
})
export class GameGridComponent implements OnInit, OnDestroy {
    @Output() visibilityChange = new EventEmitter<boolean>();
    private _grid: BoardCell[][] = [];
    private destroy$ = new Subject<void>();

    constructor(
        private alertService: AlertService,
        private gridService: GridService,
        private itemService: ItemService,
        private router: Router,
    ) {}

    get grid() {
        return this._grid;
    }

    get isDefined() {
        return this.gridService.objectGrid;
    }

    @HostListener('document:keydown.enter', ['$event'])
    async saveGrid() {
        const wrongGrid: BoardCell[][] = this.gridService.game.grid;
        this.gridService.game.grid = this.gridService.createNewGrid(this.grid);
        if (GridVerifier.validateGameMapFromFrontend(this.gridService.game)) {
            this.alertService.alert(GridVerifier.validateGameMapFromFrontend(this.gridService.game));
            this.gridService.game.grid = wrongGrid;
            return;
        }
        this.gridService.objectGrid.board = this.grid;
        await this.takeScreenshot();
        this.visibilityChange.emit(true);
    }
    getCursorStyle(): string {
        if (this.gridService.clickedTile !== TileTypes.Default) {
            return 'default';
        } else {
            return 'grab';
        }
    }
    onDrop(event: DragEvent) {
        this.gridService.onDrop(event);
    }

    allowDrop(event: DragEvent) {
        this.gridService.allowDrop(event);
    }

    onDragStart(dragStartEvent: DragStartEvent): void {
        this.gridService.onDragStart(dragStartEvent);
    }

    onMouseUp(event: MouseEvent, coords?: Coords) {
        this.gridService.onMouseUp(event, coords);
    }

    onMouseDown(event: MouseEvent, coords?: Coords) {
        this.gridService.onMouseDown(event, coords);
    }

    ngOnInit() {
        try {
            this.gridService.init();
        } catch (error) {
            this.router.navigate([Routes.Admin]);
        }
        this.gridService.grid$.pipe(takeUntil(this.destroy$)).subscribe((updatedGrid) => {
            this._grid = updatedGrid;
        });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    resetGrid() {
        this.gridService.resetGrid();
    }

    getImage(coords: Coords): string {
        return TILE_IMAGES.get(this.getTileContent(coords)) as string;
    }

    getTileContent(coords: Coords): string {
        const grid = this.gridService.gridSubject.getValue();
        return grid[coords.row][coords.col].tile;
    }

    getItem(coords: Coords) {
        return this.gridService.getItem(coords);
    }

    getItemImage(coords: Coords): string {
        let item = this.getItem(coords);
        item = this.itemService.getItemId(item) as string;
        return ITEM_IMAGE_MAP[item as ItemId];
    }

    getItemDescription(coords: Coords): string {
        const grid = this.gridService.gridSubject.value;
        if (this.gridService.clickedTile !== TileTypes.Default) return '';
        return grid[coords.row][coords.col].item.description;
    }

    getTileSize(): string {
        return `calc(70vmin / ${+this.gridService.objectGrid.gridSize})`;
    }

    getId(coords: Coords): string {
        const item = this.gridService.getItem(coords);
        return item.startsWith('tile-') ? item : `tile-${item}`;
    }

    getSize(): number {
        return +this.gridService.objectGrid.gridSize;
    }

    getIsTooltipVisible(): boolean {
        return this.gridService.isTooltipVisible;
    }

    async takeScreenshot() {
        const grid = document.querySelector('.grid');
        if (grid) {
            try {
                const canvas = await Html2CanvasWrapper.html2canvas(grid as HTMLElement, {
                    useCORS: true,
                    scale: 1,
                });

                const imgData = canvas.toDataURL('image/png');
                this.gridService.objectGrid.imagePayload = imgData.split(',')[1];
                sessionStorage.setItem('gameToEdit', JSON.stringify(this.gridService.objectGrid));
            } catch (error) {
                alert(error);
            }
        }
    }
}
