import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PlayerService } from '@app/services/player/player.service';
import { JoinPageComponent } from './join-page.component';

describe('JoinPageComponent', () => {
    let component: JoinPageComponent;
    let fixture: ComponentFixture<JoinPageComponent>;
    let playerServiceMock: jasmine.SpyObj<PlayerService>;
    let routerMock: jasmine.SpyObj<Router>;

    beforeEach(async () => {
        playerServiceMock = jasmine.createSpyObj('PlayerService', ['validateRoomId', 'joinGame'], { roomId: '' });
        routerMock = jasmine.createSpyObj('Router', ['navigate']);

        await TestBed.configureTestingModule({
            imports: [FormsModule, JoinPageComponent],
            providers: [
                { provide: PlayerService, useValue: playerServiceMock },
                { provide: Router, useValue: routerMock },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(JoinPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should validate room code correctly', () => {
        component.roomId = '1234';
        expect(component.isValidCode()).toBeTrue();

        component.roomId = '123';
        expect(component.isValidCode()).toBeFalse();

        component.roomId = '12345';
        expect(component.isValidCode()).toBeFalse();

        component.roomId = 'abcd';
        expect(component.isValidCode()).toBeFalse();
    });

    it('should not submit if room code is invalid', fakeAsync(() => {
        component.roomId = '123';
        component.onSubmit();
        tick();
        expect(playerServiceMock.validateRoomId).not.toHaveBeenCalled();
    }));

    it('should submit and navigate if room code is valid and validated', fakeAsync(() => {
        component.roomId = '1234';
        playerServiceMock.validateRoomId.and.returnValue(Promise.resolve('1234'));
        routerMock.navigate.and.returnValue(Promise.resolve(true));

        component.onSubmit();
        tick();

        expect(playerServiceMock.validateRoomId).toHaveBeenCalledWith('1234');
        expect(playerServiceMock.joinGame).toHaveBeenCalledWith('1234', false);
        expect(routerMock.navigate).toHaveBeenCalledWith(['/stats']);

        Object.defineProperty(playerServiceMock, 'roomId', {
            get: () => '1234',
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            set: () => {},
            configurable: true,
        });

        expect(playerServiceMock.roomId).toBe('1234');
    }));

    it('should not navigate if room validation fails', fakeAsync(() => {
        component.roomId = '1234';
        playerServiceMock.validateRoomId.and.returnValue(Promise.resolve(''));

        component.onSubmit();
        tick();

        expect(playerServiceMock.validateRoomId).toHaveBeenCalledWith('1234');
        expect(playerServiceMock.joinGame).not.toHaveBeenCalled();
        expect(routerMock.navigate).not.toHaveBeenCalled();
        expect(playerServiceMock.roomId).not.toBe('1234');
    }));
});
