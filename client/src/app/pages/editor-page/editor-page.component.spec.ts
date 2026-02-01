import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DescriptionComponent } from '@app/components/description/description.component';
import { GameGridComponent } from '@app/components/game-grid/game-grid.component';
import { ItemBarComponent } from '@app/components/item-bar/item-bar.component';
import { TileBarComponent } from '@app/components/tile-bar/tile-bar.component';
import { GridService } from '@app/services/grid-service/grid-service.service';
import { EditorPageComponent } from './editor-page.component';

describe('EditorPageComponent', () => {
    let component: EditorPageComponent;
    let fixture: ComponentFixture<EditorPageComponent>;
    let gridServiceSpy: jasmine.SpyObj<GridService>;

    beforeEach(async () => {
        const spy = jasmine.createSpyObj('GridService', ['onMouseMove', 'onDragEnd', 'onContextMenu', 'onMouseUp', 'onMouseDown']);

        await TestBed.configureTestingModule({
            imports: [EditorPageComponent, DescriptionComponent, TileBarComponent, ItemBarComponent, GameGridComponent],
            providers: [{ provide: GridService, useValue: spy }],
        }).compileComponents();

        gridServiceSpy = TestBed.inject(GridService) as jasmine.SpyObj<GridService>;
        fixture = TestBed.createComponent(EditorPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should call gridService.onMouseMove when onMouseMove is called', () => {
        const event = new MouseEvent('mousemove');
        component.onMouseMove(event);
        expect(gridServiceSpy.onMouseMove).toHaveBeenCalledWith(event);
    });

    it('should call gridService.onDragEnd when onDragEnd is called', () => {
        const event = new DragEvent('dragend');
        component.onDragEnd(event);
        expect(gridServiceSpy.onDragEnd).toHaveBeenCalledWith(event);
    });

    it('should call gridService.onContextMenu when onContextMenu is called', () => {
        const event = new MouseEvent('contextmenu');
        component.onContextMenu(event);
        expect(gridServiceSpy.onContextMenu).toHaveBeenCalledWith(event);
    });

    it('should call gridService.onMouseUp when onMouseUp is called', () => {
        const event = new MouseEvent('mouseup');
        component.onMouseUp(event);
        expect(gridServiceSpy.onMouseUp).toHaveBeenCalledWith(event);
    });

    it('should call gridService.onMouseDown when onMouseDown is called', () => {
        const event = new MouseEvent('mousedown');
        component.onMouseDown(event);
        expect(gridServiceSpy.onMouseDown).toHaveBeenCalledWith(event);
    });

    it('should toggle isSaving when toggleIsSaving is called', () => {
        expect(component.isSaving).toBeFalse();
        component.toggleIsSaving(true);
        expect(component.isSaving).toBeTrue();
        component.toggleIsSaving(false);
        expect(component.isSaving).toBeFalse();
    });
});
