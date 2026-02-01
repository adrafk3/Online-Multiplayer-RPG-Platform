import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GameCardComponent } from './game-card.component';
import { GameSizes } from '@common/enums';

describe('GameCardComponent', () => {
    let component: GameCardComponent;
    let fixture: ComponentFixture<GameCardComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameCardComponent, MatTooltipModule],
        }).compileComponents();

        fixture = TestBed.createComponent(GameCardComponent);
        component = fixture.componentInstance;

        component.game = {
            _id: '1',
            name: 'Test Game',
            description: 'Test Description',
            gameMode: 'Classic',
            isHidden: false,
            gridSize: GameSizes.Big,
            imagePayload: 'base64ImageData',
            lastModified: '2025-02-04',
        };
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('Input Properties', () => {
        it('should correctly bind input properties', () => {
            component.game.imagePayload = 'base64ImageData';
            component.game.name = 'Test Game';
            component.game.gridSize = GameSizes.Big;
            component.game.gameMode = 'Classic';
            component.game.lastModified = '2025-02-04';
            component.game.isHidden = false;
            component.game.description = 'Test Description';

            fixture.detectChanges();

            expect(component.game.imagePayload).toBe('base64ImageData');
            expect(component.game.name).toBe('Test Game');
            expect(component.game.gridSize).toBe(GameSizes.Big);
            expect(component.game.gameMode).toBe('Classic');
            expect(component.game.lastModified).toBe('2025-02-04');
            expect(component.game.isHidden).toBeFalse();
            expect(component.game.description).toBe('Test Description');
        });
    });

    describe('onEdit', () => {
        it('should emit edit event when onEdit is called', () => {
            spyOn(component.edit, 'emit');
            component.onEdit();
            expect(component.edit.emit).toHaveBeenCalled();
        });
    });

    describe('onHide', () => {
        it('should toggle isHidden and emit hide event', () => {
            spyOn(component.hide, 'emit');
            component.onHide();
            expect(component.hide.emit).toHaveBeenCalled();
            component.onHide();
            expect(component.hide.emit).toHaveBeenCalledTimes(2);
        });
    });

    describe('onDelete', () => {
        it('should emit delete event when onDelete is called', () => {
            spyOn(component.delete, 'emit');
            component.onDelete();
            expect(component.delete.emit).toHaveBeenCalled();
        });
    });
});
