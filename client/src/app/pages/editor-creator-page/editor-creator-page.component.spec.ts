import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditorCreatorPageComponent } from './editor-creator-page.component';
import { MapSettingsComponent } from '@app/components/map-settings/map-settings.component';

describe('EditorCreatorPageComponent', () => {
    let component: EditorCreatorPageComponent;
    let fixture: ComponentFixture<EditorCreatorPageComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [EditorCreatorPageComponent, MapSettingsComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(EditorCreatorPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should import MapSettingsComponent', () => {
        const mapSettingsElement = fixture.nativeElement.querySelector('app-map-settings');
        expect(mapSettingsElement).toBeTruthy();
    });
});
