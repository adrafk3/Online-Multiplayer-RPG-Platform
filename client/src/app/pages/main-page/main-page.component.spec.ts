import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { MainPageComponent } from './main-page.component';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';

describe('MainPageComponent', () => {
    let component: MainPageComponent;
    let fixture: ComponentFixture<MainPageComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [MainPageComponent],
            providers: [provideRouter([]), provideHttpClient()],
        }).compileComponents();

        fixture = TestBed.createComponent(MainPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should have three buttons with correct routes', () => {
        const buttons = fixture.debugElement.queryAll(By.css('button.mainPageButton'));
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        expect(buttons.length).toBe(3);

        expect(buttons[0].attributes['ng-reflect-router-link']).toBe('/join');
        expect(buttons[0].nativeElement.textContent).toContain('Joindre une partie');

        expect(buttons[1].attributes['ng-reflect-router-link']).toBe('/game-creation');
        expect(buttons[1].nativeElement.textContent).toContain('Créer une partie');

        expect(buttons[2].attributes['ng-reflect-router-link']).toBe('/admin');
        expect(buttons[2].nativeElement.textContent).toContain('Administrer les jeux');
    });
});
