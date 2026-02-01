import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AvatarIconComponent } from './avatar-icon.component';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

describe('AvatarIconComponent', () => {
    let component: AvatarIconComponent;
    let fixture: ComponentFixture<AvatarIconComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AvatarIconComponent],
            providers: [provideHttpClient(), provideHttpClientTesting()],
        }).compileComponents();

        fixture = TestBed.createComponent(AvatarIconComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should emit selected event when onSelect is called', () => {
        spyOn(component.selected, 'emit');
        component.onSelect();
        expect(component.selected.emit).toHaveBeenCalled();
    });
});
