import { TestBed, ComponentFixture } from '@angular/core/testing';
import { AppComponent } from '@app/pages/app/app.component';
import { Router, NavigationEnd, Event, NavigationStart } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SocketService } from '@app/services/socket/socket.service';
import { PlayerService } from '@app/services/player/player.service';

describe('AppComponent', () => {
    let component: AppComponent;
    let fixture: ComponentFixture<AppComponent>;
    let router: jasmine.SpyObj<Router>;
    let routerEvents: BehaviorSubject<Event>;
    let socketService: jasmine.SpyObj<SocketService>;
    let playerService: jasmine.SpyObj<PlayerService>;
    let audioSpy: jasmine.SpyObj<HTMLAudioElement>;

    beforeEach(async () => {
        routerEvents = new BehaviorSubject<Event>(new NavigationStart(0, ''));
        router = jasmine.createSpyObj('Router', [], {
            events: routerEvents.asObservable(),
            url: '/test',
        });

        socketService = jasmine.createSpyObj('SocketService', ['connect', 'on', 'send', 'sendMessage', 'off', 'isConnected']);
        socketService.isConnected.and.returnValue(new BehaviorSubject<boolean>(false).asObservable());
        playerService = jasmine.createSpyObj('PlayerService', ['quitGame']);

        audioSpy = jasmine.createSpyObj('HTMLAudioElement', ['load'], {
            loop: false,
            volume: 1,
            muted: true,
            play: jasmine.createSpy().and.returnValue(Promise.resolve()),
        });
        spyOn(window, 'Audio').and.returnValue(audioSpy);

        await TestBed.configureTestingModule({
            imports: [AppComponent],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: Router, useValue: router },
                { provide: SocketService, useValue: socketService },
                { provide: PlayerService, useValue: playerService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(AppComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the app', () => {
        expect(component).toBeTruthy();
    });

    it('should show header by default for non-excluded routes', () => {
        routerEvents.next(new NavigationEnd(1, '/test', '/test'));
        expect(component.showHeader).toBeTrue();
    });

    it('should hide header for excluded routes', () => {
        Object.defineProperty(router, 'url', { get: () => '/home' });
        routerEvents.next(new NavigationEnd(1, '/home', '/home'));
        expect(component.showHeader).toBeFalse();
    });

    it('should ignore non-NavigationEnd events', () => {
        const initialHeaderState = component.showHeader;
        routerEvents.next({ someOtherEvent: true } as unknown as Event);
        expect(component.showHeader).toBe(initialHeaderState);
    });

    it('should have correct excluded routes', () => {
        expect(component['excludedRoutes']).toContain('/home');
    });

    it('should call socketService.connect on ngOnInit', () => {
        component.ngOnInit();
        expect(socketService.connect).toHaveBeenCalled();
    });

    it('should initialize audio on ngOnInit', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        spyOn(component as any, 'initializeAudio');
        component.ngOnInit();
        expect(component['initializeAudio']).toHaveBeenCalled();
    });

    it('should initialize audio only once', () => {
        component['initializeAudio']();
        component['initializeAudio']();
        expect(window.Audio).toHaveBeenCalledTimes(1);
    });

    it('should toggle mute state', () => {
        component.toggleMute();
        expect(component.isMuted).toBeTrue();
    });

    it('should initialize audio when toggling mute if not initialized', () => {
        component['audioInitialized'] = false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        spyOn(component as any, 'initializeAudio');
        component.toggleMute();
        expect(component['initializeAudio']).toHaveBeenCalled();
    });

    it('should play audio when unmuting', () => {
        component['audioInitialized'] = true;
        component['themeAudio'] = audioSpy;
        audioSpy.muted = false;
        component.toggleMute();
        expect(audioSpy.muted).toBeTrue();
    });
    it('should play audio when isMuted returns false', () => {
        component['themeAudio'] = audioSpy;
        component['audioInitialized'] = true;
        spyOnProperty(component, 'isMuted', 'get').and.returnValue(false);

        component.toggleMute();
        expect(audioSpy.play).toHaveBeenCalled();
    });
    it('should mute audio when isMuted returns true', () => {
        component['themeAudio'] = audioSpy;
        component['audioInitialized'] = true;
        spyOnProperty(component, 'isMuted', 'get').and.returnValue(true);

        component.toggleMute();
        expect(audioSpy.muted).toBeTrue();
    });
});
