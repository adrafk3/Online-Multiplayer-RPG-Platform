import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DebugState } from '@app/enums/debug-enums';
import { DebugService } from '@app/services/debug-service/debug-service.service';
import { PlayerService } from '@app/services/player/player.service';
import { BehaviorSubject } from 'rxjs';
import { DebugComponent } from './debug.component';

describe('DebugComponent', () => {
    let component: DebugComponent;
    let fixture: ComponentFixture<DebugComponent>;
    let mockDebugService: jasmine.SpyObj<DebugService>;
    let mockPlayerService: jasmine.SpyObj<PlayerService>;
    let debugStateSubject: BehaviorSubject<boolean>;

    beforeEach(async () => {
        debugStateSubject = new BehaviorSubject<boolean>(false);
        mockDebugService = jasmine.createSpyObj('DebugService', ['toggleDebug', 'init', 'reset'], {
            isDebug: debugStateSubject.asObservable(),
        });
        mockPlayerService = jasmine.createSpyObj('PlayerService', [], {
            player: { isHost: true },
            roomId: 'room1',
        });

        await TestBed.configureTestingModule({
            imports: [DebugComponent],
            providers: [
                { provide: DebugService, useValue: mockDebugService },
                { provide: PlayerService, useValue: mockPlayerService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(DebugComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        fixture.destroy();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should toggle debug mode when toggleDebug is called', () => {
        expect(component.getDebug()).toBe(DebugState.OFF);
        component.toggleDebug();
        expect(mockDebugService.toggleDebug).toHaveBeenCalledWith('room1');
        debugStateSubject.next(true);
        fixture.detectChanges();
        expect(component.getDebug()).toBe(DebugState.ON);
    });

    it('should not toggle debug mode if the player is not the host', () => {
        Object.defineProperty(mockPlayerService, 'player', {
            get: () => ({ isHost: false }),
        });
        component.toggleDebug();
        expect(mockDebugService.toggleDebug).not.toHaveBeenCalled();
    });

    it('should update debug status correctly', () => {
        expect(component.getDebug()).toBe(DebugState.OFF);
        debugStateSubject.next(true);
        fixture.detectChanges();
        expect(component.getDebug()).toBe(DebugState.ON);
    });

    it('should listen for "d" key press and toggle debug mode', () => {
        spyOn(component, 'toggleDebug');
        const event = new KeyboardEvent('keydown', { key: 'd' });
        document.dispatchEvent(event);
        expect(component.toggleDebug).toHaveBeenCalled();
    });

    it('should call init on ngOnInit', () => {
        component.ngOnInit();
        expect(mockDebugService.init).toHaveBeenCalled();
    });

    it('should call reset on ngOnDestroy', () => {
        component.ngOnDestroy();
        expect(mockDebugService.reset).toHaveBeenCalled();
    });
});
