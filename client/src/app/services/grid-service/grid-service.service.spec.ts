import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { DragDropService } from '@app/services/drag-drop/drag-drop.service';
import { GridService } from '@app/services/grid-service/grid-service.service';
import { GAME_DATA } from '@common/constants.spec';
import { ItemId, ItemTypes, TileTypes } from '@common/enums';
import { take } from 'rxjs/operators';

describe('GridService', () => {
    let service: GridService;
    let dragDropService: jasmine.SpyObj<DragDropService>;

    beforeEach(() => {
        const dragDropSpy = jasmine.createSpyObj('DragDropService', [
            'onDragStart',
            'onDragEnd',
            'setIsDragging',
            'setItemCounter',
            'setDraggable',
            'giveItemId',
            'incrementObject',
            'decrementObject',
        ]);

        TestBed.configureTestingModule({
            providers: [GridService, { provide: DragDropService, useValue: dragDropSpy }, provideHttpClient(), provideHttpClientTesting()],
        });

        service = TestBed.inject(GridService);
        dragDropService = TestBed.inject(DragDropService) as jasmine.SpyObj<DragDropService>;
        const mockData = GAME_DATA;
        mockData.board[0][0].item.name = ItemId.ItemStartingPoint;
        sessionStorage.setItem('gameToEdit', JSON.stringify(mockData));
        service['init']();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('Grid Initialization', () => {
        it('should initialize grid with correct size and set up items', () => {
            const itemArray = [ItemId.Item1, ItemId.Item7 + 'A'];
            const getItemSpy = spyOn(document, 'getElementById');
            jasmine.clock().install();
            for (const item of itemArray) {
                const mockData = JSON.parse(JSON.stringify(GAME_DATA));
                mockData.board[0][0].item.name = item;
                const mockItem = document.createElement('div');
                mockItem.id = item;
                getItemSpy.and.returnValue(mockItem);

                sessionStorage.setItem('gameToEdit', JSON.stringify(GAME_DATA));
                service['init']();
                const TIMEOUT_WAIT = 20;
                jasmine.clock().tick(TIMEOUT_WAIT);
                service.grid$.pipe(take(1)).subscribe((grid) => {
                    expect(grid.length).toBe(GAME_DATA.gridSize);
                    expect(grid[0].length).toBe(GAME_DATA.gridSize);
                    expect(dragDropService.setDraggable).toHaveBeenCalled();
                    expect(dragDropService.decrementObject).toHaveBeenCalled();
                });
            }
            jasmine.clock().uninstall();
        });

        it('should initialize grid with a created grid', () => {
            const mockData = JSON.parse(JSON.stringify(GAME_DATA));
            mockData.board = undefined;
            sessionStorage.setItem('gameToEdit', JSON.stringify(mockData));

            service['init']();
            service.grid$.pipe(take(1)).subscribe((grid) => {
                expect(grid.length).toBe(GAME_DATA.gridSize);
                expect(grid[0].length).toBe(GAME_DATA.gridSize);
            });
        });
    });

    describe('Mouse Events', () => {
        let mockEvent: MouseEvent;

        beforeEach(() => {
            mockEvent = new MouseEvent('mousedown', {
                bubbles: true,
                cancelable: true,
                button: 0,
            });
        });

        it('should handle mouse down on left click', () => {
            const centerContent = document.createElement('div');
            centerContent.className = 'center-content';
            Object.defineProperty(mockEvent, 'target', { value: centerContent });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updateTileSpy = spyOn(service as any, 'updateTile');
            service.clickedTile = TileTypes.Ice;
            service.onMouseDown(mockEvent, { row: 0, col: 0 });

            expect(service.isDragging).toBe(true);
            expect(service.isDeleting).toBe(false);
            service.onMouseDown(mockEvent, { row: 5, col: 5 });
            expect(updateTileSpy).toHaveBeenCalled();
        });
        it('should handle mouse down on right click', () => {
            const centerContent = document.createElement('div');
            centerContent.className = 'center-content';
            const rightClickEvent = new MouseEvent('mousedown', {
                bubbles: true,
                cancelable: true,
                button: 2,
            });
            Object.defineProperty(rightClickEvent, 'target', { value: centerContent });

            service.onMouseDown(rightClickEvent, { row: 0, col: 0 });

            expect(service.isDragging).toBe(true);
            expect(service.isDeleting).toBe(true);
        });
    });

    describe('Drag and Drop Operations', () => {
        beforeEach(() => {
            service.draggedItemCoords = [0, 1];
            service.gridSubject.value[0][1].item.name = ItemId.Item5;
            service.gridSubject.value[0][1].item.description = 'desc';
        });

        it('should handle drag start', () => {
            const mockEvent = new DragEvent('dragstart');
            const dragStartEvent = { event: mockEvent, coords: { row: 0, col: 0 }, item: ItemTypes.Item, description: ItemTypes.Item };
            service.onDragStart(dragStartEvent);

            expect(dragDropService.onDragStart).toHaveBeenCalledWith(mockEvent, ItemTypes.Item, ItemTypes.Item);
            expect(service.draggedItemCoords).toEqual([0, 0]);
            expect(service.isTooltipVisible).toBe(true);
        });

        it('should handle drag end', () => {
            const mockEvent = new DragEvent('dragend');
            service.onDragEnd(mockEvent);

            expect(dragDropService.onDragEnd).toHaveBeenCalledWith(mockEvent);
            expect(service.isTooltipVisible).toBe(false);
        });

        it('should handle drop event', () => {
            const mockEvent = new DragEvent('drop');
            const mockDataTransfer = new DataTransfer();
            mockDataTransfer.setData('text', 'tile-item-1,test description');
            Object.defineProperty(mockEvent, 'dataTransfer', { value: mockDataTransfer });

            const targetParent = document.createElement('div');
            targetParent.className = 'tile';
            const targetElement = document.createElement('div');
            targetParent.setAttribute('data-row', '0');
            targetParent.setAttribute('data-col', '0');
            targetParent.appendChild(targetElement);
            Object.defineProperty(mockEvent, 'target', { value: targetElement });

            spyOn(service['gridSubject'], 'next');

            dragDropService.giveItemId.and.returnValue('tile-' + ItemId.Item1);

            service.onDrop(mockEvent);

            expect(dragDropService.setIsDragging).toHaveBeenCalledWith(false);
            service.grid$.pipe(take(1)).subscribe((grid) => {
                expect(grid[0][0].item.name).toBe(ItemId.Item1);
                expect(grid[0][0].item.description).toBe('test description');
                expect(grid[1][1].item.name).toBe('');
                expect(grid[1][1].item.description).toBe('');
            });
        });
    });

    describe('Grid Manipulation', () => {
        beforeEach(() => {
            const mockItem = document.createElement('div');
            mockItem.id = ItemId.Item5;
            spyOn(document, 'getElementById').and.callFake((id: string) => {
                if (id === ItemId.Item5) {
                    return mockItem;
                }
                return null;
            });
        });

        it('should update tile type', () => {
            service.clickedTile = TileTypes.Ice;
            service.isDeleting = false;

            service['updateTile']({ row: 0, col: 0 });

            service.grid$.pipe(take(1)).subscribe((grid) => {
                expect(grid[0][0].tile).toBe(TileTypes.Ice);
            });
        });
        it('should delete the Item', () => {
            service.grid$.pipe(take(1)).subscribe((grid) => {
                grid[0][0].item.name = ItemId.Item5;
            });
            service.draggedItemCoords = [0, 0];
            service.dropDeleteItem();

            service.grid$.pipe(take(1)).subscribe((grid) => {
                expect(grid[0][0].item.name).toBe('');
            });
        });
        it('should handle door toggle', () => {
            service.clickedTile = TileTypes.Door;
            service.isMoving = false;
            expect(service['toggleDoor'](TileTypes.Default)).toBe(TileTypes.Door);
            expect(service['toggleDoor'](TileTypes.Door)).toBe(TileTypes.OpenedDoor);
            service.isMoving = true;
            expect(service['toggleDoor'](TileTypes.OpenedDoor)).toBe(TileTypes.Door);
            expect(service['toggleDoor'](TileTypes.Default)).toBe(TileTypes.Default);
        });

        it('should call door toggle when dealing with doors', () => {
            service.clickedTile = TileTypes.Door;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            spyOn(service as any, 'toggleDoor');
            service['updateTile']({ row: 0, col: 0 });

            expect(service['toggleDoor']).toHaveBeenCalled();
        });

        it('should reset grid to initial state', () => {
            service.game.grid.forEach((row) => {
                row.forEach((cell) => {
                    cell.tile = TileTypes.Default;
                    cell.item.name = ItemId.Item7;
                    cell.item.description = '';
                });
            });
            service.grid$.pipe(take(1)).subscribe((grid) => {
                grid[0][0].tile = TileTypes.Ice;
                grid[0][1].tile = TileTypes.OpenedDoor;
                grid[0][0].item.name = ItemId.Item7;
            });
            service['resetGrid']();

            service.grid$.pipe(take(1)).subscribe((grid) => {
                grid.forEach((row) => {
                    row.forEach((cell) => {
                        expect(cell.tile).toBe(TileTypes.Default);
                        expect(cell.item.name).toBe(ItemId.Item7);
                        expect(cell.item.description).toBe('');
                    });
                });
            });
        });
    });
    describe('handle Tile Update', () => {
        let mockItem: HTMLElement;
        beforeEach(() => {
            mockItem = document.createElement('div');
            mockItem.setAttribute('id', ItemId.Item7 + 'A');
            spyOn(document, 'getElementById').and.callFake((id: string) => {
                if (id === ItemId.Item7) {
                    return mockItem;
                }
                return null;
            });
            document.body.appendChild(mockItem);
        });
        it('should call update tile if the clicked tile is not default', () => {
            service.isDeleting = false;
            service.clickedTile = TileTypes.Ice;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updateTileSpy = spyOn(service as any, 'updateTile');
            service['handleTileUpdate']({ row: 0, col: 0 }, mockItem);
            expect(updateTileSpy).toHaveBeenCalled();
        });
        it('should not delete the Item', () => {
            service.gridSubject.value[0][0].item.name = ItemId.Item7;
            service.isDeleting = false;
            service['updateItem']({ row: 0, col: 0 });
            expect(service.gridSubject.value[0][0].item.name).toBe(ItemId.Item7);
        });
        it('should return the same grid', () => {
            service.isDeleting = true;
            service['handleTileUpdate']({ row: 0, col: 0 }, mockItem);
            service.gridSubject.value[0][0].tile = TileTypes.Door;
            expect(service.gridSubject.value[0][0].tile).toBe(TileTypes.Door);
        });
        it('should put back the item if a Non-Terrain tile is put under', () => {
            service.isDeleting = false;
            service.gridSubject.value[0][0].item.name = ItemId.Item7;
            service.gridSubject.value[0][0].item.description = 'desc';
            service.clickedTile = TileTypes.Door;
            service['handleTileUpdate']({ row: 0, col: 0 }, mockItem);

            expect(dragDropService.setDraggable).toHaveBeenCalled();
            expect(dragDropService.incrementObject).toHaveBeenCalled();
            expect(service.gridSubject.value[0][0].item.name).toBe('');
            expect(service.gridSubject.value[0][0].item.description).toBe('');
        });
    });
    it('should return undefined if the item does not have row and col attributes', () => {
        const invalidItem = document.createElement('div');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((service as any).getCoords(invalidItem)).toBe(undefined);
    });
});
