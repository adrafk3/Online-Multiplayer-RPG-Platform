import { TestBed } from '@angular/core/testing';
import { DragDropService } from '@app/services/drag-drop/drag-drop.service';
import { GAME_DATA } from '@common/constants.spec';
import { ItemId, ItemTypes, TileTypes } from '@common/enums';
import { take } from 'rxjs';
import { GridService } from '@app/services/grid-service/grid-service.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

describe('GridService', () => {
    let service: GridService;
    let dragDropServiceSpy: jasmine.SpyObj<DragDropService>;

    beforeEach(() => {
        const spy = jasmine.createSpyObj('DragDropService', [
            'setItemCounter',
            'setDraggable',
            'decrementItemCounter',
            'onDragEnd',
            'incrementItemCounter',
            'onDragStart',
            'setIsDragging',
            'giveItemId',
            'incrementObject',
            'decrementObject',
        ]);

        TestBed.configureTestingModule({
            providers: [GridService, { provide: DragDropService, useValue: spy }, provideHttpClient(), provideHttpClientTesting()],
        });

        service = TestBed.inject(GridService);
        dragDropServiceSpy = TestBed.inject(DragDropService) as jasmine.SpyObj<DragDropService>;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('onMouseMove', () => {
        let mockEvent: MouseEvent;
        let preventDefaultSpy: jasmine.Spy;
        beforeEach(() => {
            mockEvent = new MouseEvent('mousemove');
            preventDefaultSpy = spyOn(mockEvent, 'preventDefault');
            const mockData = JSON.parse(JSON.stringify(GAME_DATA));
            mockData.board[0][0].item.name = ItemId.Item7;
            const mockItem = document.createElement('div');
            const getItemSpy = spyOn(document, 'getElementById');
            mockItem.id = ItemId.Item7;
            getItemSpy.and.returnValue(mockItem);
            sessionStorage.setItem('gameToEdit', JSON.stringify(mockData));
            service['init']();
            service.isDragging = true;
            const mockParent = document.createElement('div');
            mockParent.classList.add('tile');
            mockParent.setAttribute('data-row', '0');
            mockParent.setAttribute('data-col', '0');

            const mockTarget = document.createElement('div');
            mockParent.appendChild(mockTarget);
            Object.defineProperty(mockEvent, 'target', { value: mockTarget });
        });

        it('should set isMoving to true', () => {
            service.isDragging = true;
            service.onMouseMove(mockEvent);
            expect(service.isMoving).toBeTrue();
        });

        it('should return early if not dragging ', () => {
            service.isDragging = false;
            service.onMouseMove(mockEvent);
            expect(preventDefaultSpy).not.toHaveBeenCalled();
            expect(service.isMoving).toBe(false);
        });

        it('should call preventDefault when dragging', () => {
            service.isDragging = true;
            service.onMouseMove(mockEvent);
            expect(preventDefaultSpy).toHaveBeenCalled();
        });

        it('should update tile and handle existing item if target has data-row and data-col attributes', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updateTileSpy = spyOn(service as any, 'updateTile');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            spyOn(service as any, 'handleTileUpdate');

            service.onMouseMove(mockEvent);
            expect(updateTileSpy).toHaveBeenCalled();
            expect(service['handleTileUpdate']).toHaveBeenCalled();
        });
    });

    describe('onDragEnd', () => {
        let mockEvent: DragEvent;
        beforeEach(() => {
            mockEvent = new DragEvent('dragend');
            dragDropServiceSpy = jasmine.createSpyObj('DragDropService', ['onDragEnd']);
            service['dragDropService'] = dragDropServiceSpy;
        });
        it('should call onDragEnd of DragDropService', () => {
            service.onDragEnd(mockEvent);

            expect(dragDropServiceSpy.onDragEnd).toHaveBeenCalledWith(mockEvent);
        });
        it('should make the tooltip invisible', () => {
            service.onDragEnd(mockEvent);
            expect(service.isTooltipVisible).toBeFalse();
        });
    });

    describe('onMouseUp', () => {
        let mockEvent: MouseEvent;
        let updateItemSpy: jasmine.Spy;

        beforeEach(() => {
            mockEvent = new MouseEvent('mouseup', { button: 2 });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            updateItemSpy = spyOn(service as any, 'updateItem');
            service.isDeleting = true;
            service.isMoving = false;
            service.isDragging = true;
        });

        it('should call updateItem if conditions are met', () => {
            service.onMouseUp(mockEvent, { row: 1, col: 1 });

            expect(updateItemSpy).toHaveBeenCalledWith({ row: 1, col: 1 });
        });

        it('should not call updateItem if not deleting or moving', () => {
            service.isDeleting = false;
            service.isMoving = false;

            service.onMouseUp(mockEvent, { row: 1, col: 1 });

            expect(updateItemSpy).not.toHaveBeenCalled();
        });

        it('should set flags to false after mouse up', () => {
            service.onMouseUp(mockEvent, { row: 1, col: 1 });

            expect(service.isDeleting).toBeFalse();
            expect(service.isDragging).toBeFalse();
            expect(service.isMoving).toBeFalse();
        });

        it('should call preventDefault', () => {
            const preventDefaultSpy = spyOn(mockEvent, 'preventDefault');
            service.onMouseUp(mockEvent, { row: 1, col: 1 });
            expect(preventDefaultSpy).toHaveBeenCalled();
        });
    });

    describe('onMouseDown', () => {
        let mockEvent: MouseEvent;
        let handleTileUpdateSpy: jasmine.Spy;
        beforeEach(() => {
            mockEvent = new MouseEvent('mousedown', { button: 0 });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            handleTileUpdateSpy = spyOn(service as any, 'handleTileUpdate');
            const centerContent = document.createElement('div');
            centerContent.className = 'center-content';
            centerContent.setAttribute('data-row', '0');
            centerContent.setAttribute('data-col', '0');
            Object.defineProperty(mockEvent, 'target', { value: centerContent });
            sessionStorage.setItem('gameToEdit', JSON.stringify(GAME_DATA));
            service['init']();
        });

        it('should set isDeleting and isDragging to true and isDeleting to false if a tile is clicked on grid', () => {
            service.clickedTile = TileTypes.Ice;
            service.onMouseDown(mockEvent, { row: 0, col: 0 });
            expect(service.isDragging).toBeTrue();
            expect(service.isDeleting).toBeFalse();
        });

        it('should set isDragging to true and isDeleting to true on right click', () => {
            Object.defineProperty(mockEvent, 'button', { value: 2 });
            service.onMouseDown(mockEvent, { row: 0, col: 0 });
            expect(service.isDragging).toBeTrue();
            expect(service.isDeleting).toBeTrue();
        });

        it('should not do anything if a different mouse button is clicked', () => {
            Object.defineProperty(mockEvent, 'button', { value: 1 });
            service.onMouseDown(mockEvent, { row: 0, col: 0 });
            expect(service.isDragging).toBeFalse();
            expect(service.isDeleting).toBeFalse();
        });

        it('should call handleTileUpdate if item exists', () => {
            const itemArray = [ItemId.Item1, ItemId.Item7 + 'A'];
            const getItemSpy = spyOn(document, 'getElementById');
            for (const item of itemArray) {
                service.grid$.pipe(take(1)).subscribe((grid) => {
                    grid[0][0].item.name = item;
                });
                const mockItem = document.createElement('div');
                mockItem.id = ItemId.Item1;
                getItemSpy.and.returnValue(mockItem);
                service.onMouseDown(mockEvent, { row: 0, col: 0 });
                expect(handleTileUpdateSpy).toHaveBeenCalled();
                getItemSpy.calls.reset();
            }
        });
    });

    describe('allowDrop', () => {
        let mockEvent: DragEvent;
        let mockTarget: HTMLElement;
        let preventDefaultSpy: jasmine.Spy;
        beforeEach(() => {
            mockEvent = new DragEvent('dragover');
            mockTarget = document.createElement('div');
            mockTarget.setAttribute('id', TileTypes.Ice);
            preventDefaultSpy = spyOn(mockEvent, 'preventDefault');
            Object.defineProperty(mockEvent, 'target', { value: mockTarget });
        });

        it('should not call preventDefault if the tile is not a terrain tile', () => {
            mockTarget.setAttribute('id', TileTypes.Wall);
            service.allowDrop(mockEvent);
            expect(preventDefaultSpy).not.toHaveBeenCalled();
        });

        it('should not call preventDefault if the tile has more than one child', () => {
            const mockTile = document.createElement('div');
            mockTile.appendChild(mockTarget);
            const mockItem = document.createElement('div');
            mockTile.appendChild(mockItem);
            service.allowDrop(mockEvent);
            expect(preventDefaultSpy).not.toHaveBeenCalled();
        });

        it('should call preventDefault if the tile is a terrain tile', () => {
            service.allowDrop(mockEvent);
            expect(preventDefaultSpy).toHaveBeenCalled();
        });
    });

    describe('onDragStart', () => {
        const mockEvent = new DragEvent('dragstart');
        const dragStartEvent = { event: mockEvent, coords: { row: 0, col: 0 }, item: ItemTypes.Item, description: ItemTypes.Item };
        beforeEach(() => {
            service.onDragStart(dragStartEvent);
        });
        it('should set isToolVisible to true', () => {
            expect(service.isTooltipVisible).toBeTrue();
        });

        it('should change draggedItemCoords', () => {
            expect(service.draggedItemCoords).toEqual([0, 0]);
        });

        it('should call dragDropService', () => {
            expect(dragDropServiceSpy.onDragStart).toHaveBeenCalledWith(dragStartEvent.event, dragStartEvent.item, dragStartEvent.description);
        });
    });

    describe('onContextMenu', () => {
        it('should call preventDefault', () => {
            const mockEvent = {
                preventDefault: jasmine.createSpy('preventDefault'),
            } as unknown as MouseEvent;

            service.onContextMenu(mockEvent);
            expect(mockEvent.preventDefault).toHaveBeenCalled();
        });
    });
});
