import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService } from '@app/services/alert/alert.service';
import { EditorService } from '@app/services/editor/editor.service';
import { HttpMessage } from '@common/http-message';
import { Grid } from '@common/interfaces';
import { of, throwError } from 'rxjs';
import { DescriptionComponent } from './description.component';

describe('DescriptionComponent', () => {
    let component: DescriptionComponent;
    let fixture: ComponentFixture<DescriptionComponent>;
    let routerSpy: jasmine.SpyObj<Router>;
    let editorServiceSpy: jasmine.SpyObj<EditorService>;
    let alertServiceSpy: jasmine.SpyObj<AlertService>;

    beforeEach(async () => {
        const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);
        const editorServiceSpyObj = jasmine.createSpyObj('EditorService', ['showError', 'updateGame', 'validateAndAddMap', 'back']);
        const alertServiceSpyObj = jasmine.createSpyObj('AlertService', ['alert']);

        await TestBed.configureTestingModule({
            imports: [FormsModule, DescriptionComponent],
            providers: [
                { provide: Router, useValue: routerSpyObj },
                { provide: EditorService, useValue: editorServiceSpyObj },
                { provide: AlertService, useValue: alertServiceSpyObj },
            ],
        }).compileComponents();

        routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
        editorServiceSpy = TestBed.inject(EditorService) as jasmine.SpyObj<EditorService>;
        alertServiceSpy = TestBed.inject(AlertService) as jasmine.SpyObj<AlertService>;
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(DescriptionComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize gameObject from sessionStorage', () => {
        const mockGame: Grid = {
            name: 'Test Game',
            description: 'Test Description',
        } as Grid;
        spyOn(sessionStorage, 'getItem').and.returnValue(JSON.stringify(mockGame));
        component.ngOnInit();
        expect(component.gameObject).toEqual(mockGame);
    });

    it('should reset input styles', () => {
        const mockEvent = {
            target: document.createElement('input'),
        } as unknown as Event;
        component.reset(mockEvent);
        expect((mockEvent.target as HTMLElement).style.color).toBe('black');
        expect((mockEvent.target as HTMLElement).style.border).toBe('5pt solid cornflowerblue');
    });

    it('should not let name and description be empty on submit', async () => {
        component.gameObject = { name: ' ', description: ' ' } as Grid;
        await component.onSubmit();
        expect(alertServiceSpy.alert).toHaveBeenCalledWith('Le nom et la description doivent contenir des caractères visibles');
    });

    it('should add new game on submit', async () => {
        component.gameObject = { name: 'New Test', description: 'New Test Desc' } as Grid;
        editorServiceSpy.validateAndAddMap.and.returnValue(of([]));
        spyOn(sessionStorage, 'clear');
        await component.onSubmit();
        expect(editorServiceSpy.validateAndAddMap).toHaveBeenCalledWith(component.gameObject);
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin']);
        expect(sessionStorage.clear).toHaveBeenCalled();
    });

    it('should update existing game on submit', async () => {
        component.gameObject = { _id: '123', name: 'Updated Test', description: 'Updated Test Desc' } as Grid;
        editorServiceSpy.updateGame.and.returnValue(of([]));
        spyOn(sessionStorage, 'clear');
        await component.onSubmit();
        expect(editorServiceSpy.updateGame).toHaveBeenCalledWith(component.gameObject);
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin']);
        expect(sessionStorage.clear).toHaveBeenCalled();
    });

    it('should highlight missing fields on submit', async () => {
        component.gameObject = {} as Grid;
        const descriptionEl = document.createElement('textarea');
        const nameEl = document.createElement('input');
        descriptionEl.id = 'description';
        nameEl.id = 'name';
        document.body.appendChild(descriptionEl);
        document.body.appendChild(nameEl);

        await component.onSubmit();

        expect(descriptionEl.style.color).toBe('red');
        expect(descriptionEl.style.border).toBe('5pt solid red');
        expect(nameEl.style.color).toBe('red');
        expect(nameEl.style.border).toBe('5pt solid red');

        document.body.removeChild(descriptionEl);
        document.body.removeChild(nameEl);
    });

    it('should handle non-array HTTP error on submit', async () => {
        component.gameObject = { name: 'Test Game', description: 'Test Description' } as Grid;
        const errorResponse = new HttpErrorResponse({
            status: HttpMessage.InternalServerError,
            statusText: 'Internal Server Error',
        });
        editorServiceSpy.validateAndAddMap.and.returnValue(throwError(() => errorResponse));

        await component.onSubmit();
        expect(alertServiceSpy.alert).toHaveBeenCalledWith("Erreur avec l'enregistrement, essayez plus tard");
    });

    it('should handle name already used error on submit', async () => {
        component.gameObject = { name: 'Test Game', description: 'Test Description' } as Grid;
        const errorResponse = new HttpErrorResponse({
            status: HttpMessage.InternalServerError,
            error: 'Jeu non conforme',
        });
        editorServiceSpy.validateAndAddMap.and.returnValue(throwError(() => errorResponse));

        await component.onSubmit();

        expect(alertServiceSpy.alert).toHaveBeenCalledWith("Erreur d'enregistrement : nom déjà utilisé");
    });

    it('should handle array HTTP error on submit', async () => {
        component.gameObject = { name: 'Test Game', description: 'Test Description' } as Grid;
        const errorResponse = new HttpErrorResponse({
            error: ['Error message 1', 'Error message 2'],
            status: 400,
            statusText: 'Bad Request',
        });
        editorServiceSpy.validateAndAddMap.and.returnValue(throwError(() => errorResponse));

        await component.onSubmit();
        expect(alertServiceSpy.alert).toHaveBeenCalledWith('Error message 1\nError message 2\n');
    });
    it('should go back to map editor on back click', () => {
        spyOn(component.visibilityChange, 'emit');
        component.back();
        expect(component.visibilityChange.emit).toHaveBeenCalledWith(false);
    });
});
