import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminService } from '@app/services/admin-service/admin-service';
import { GAME_ARRAY_1 } from '@common/constants.spec';
import { HttpMessage } from '@common/http-message';
import { Game } from '@common/types';
import { of, throwError } from 'rxjs';
import { GameCreationPageComponent } from './game-creation-page.component';

describe('GameCreationPageComponent', () => {
    let component: GameCreationPageComponent;
    let fixture: ComponentFixture<GameCreationPageComponent>;
    let adminServiceSpy: jasmine.SpyObj<AdminService>;

    const mockGames: Game[] = GAME_ARRAY_1;

    beforeEach(async () => {
        adminServiceSpy = jasmine.createSpyObj('AdminService', ['getAllGames']);
        adminServiceSpy.getAllGames.and.returnValue(of(mockGames));

        await TestBed.configureTestingModule({
            imports: [GameCreationPageComponent],
            providers: [provideHttpClient(), provideHttpClientTesting(), { provide: AdminService, useValue: adminServiceSpy }],
        }).compileComponents();

        fixture = TestBed.createComponent(GameCreationPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should call loadGames on ngOnInit', () => {
        spyOn(component, 'loadGames');

        component.ngOnInit();

        expect(component.loadGames).toHaveBeenCalled();
    });

    it('should load only visible games (isHidden === false)', () => {
        adminServiceSpy.getAllGames.and.returnValue(of(mockGames));

        component.ngOnInit();
        expect(adminServiceSpy.getAllGames).toHaveBeenCalled();
        expect(component.cards).toEqual([mockGames[0], mockGames[2], mockGames[3]]);
    });

    it('should set cards to an empty array when getAllGames fails', () => {
        const errorResponse = new HttpErrorResponse({
            status: HttpMessage.NotFound,
            statusText: 'games not found',
        });

        adminServiceSpy.getAllGames.and.returnValue(throwError(() => errorResponse));

        component.loadGames();

        expect(adminServiceSpy.getAllGames).toHaveBeenCalled();
        expect(component.cards).toEqual([]);
    });
});
