import { TestBed } from '@angular/core/testing';
import { DebugService } from './debug-service.service';
import { SocketService } from '@app/services/socket/socket.service';
import { DebugEvents } from '@common/gateway-events';
import { DebugResponse } from '@common/interfaces';

describe('DebugService', () => {
    let service: DebugService;
    let mockSocketService: jasmine.SpyObj<SocketService>;

    beforeEach(() => {
        mockSocketService = jasmine.createSpyObj('SocketService', ['sendMessage', 'on', 'off', 'isConnected']);

        TestBed.configureTestingModule({
            providers: [DebugService, { provide: SocketService, useValue: mockSocketService }],
        });

        service = TestBed.inject(DebugService);
    });

    const triggerDebugToggle = (response: DebugResponse) => {
        const handler = mockSocketService.on.calls.allArgs().find((args) => args[0] === DebugEvents.ToggleDebug)?.[1];
        if (handler) handler(response);
    };

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should initialize and set up the debug listener in the constructor', () => {
        expect(mockSocketService.on).toHaveBeenCalledWith(DebugEvents.ToggleDebug, jasmine.any(Function));
    });

    it('should call debugListener when init is called and isInitialized is false', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const debugListenerSpy = spyOn(service as any, 'debugListener');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any)._isInitialized = false;
        service.init();
        expect(debugListenerSpy).toHaveBeenCalled();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((service as any)._isInitialized).toBeTrue(); // Ensure _isInitialized is set to true
    });

    it('should not call debugListener when init is called and isInitialized is true', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const debugListenerSpy = spyOn(service as any, 'debugListener');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any)._isInitialized = true;
        service.init();
        expect(debugListenerSpy).not.toHaveBeenCalled();
    });

    it('should toggle debug mode and send the correct message', () => {
        const roomId = 'room1';
        service.toggleDebug(roomId);
        expect(mockSocketService.sendMessage).toHaveBeenCalledWith(DebugEvents.ToggleDebug, { roomId });
    });

    it('should update the debug status when receiving a ToggleDebug event', (done) => {
        const debugResponse: DebugResponse = { isDebug: true };
        triggerDebugToggle(debugResponse);
        service.isDebug.subscribe((isDebug) => {
            expect(isDebug).toBe(true);
            done();
        });
    });

    it('should reset the service and clean up resources', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const resetSpy = spyOn(service as any, 'reset').and.callThrough();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).reset();
        expect(mockSocketService.off).toHaveBeenCalledWith(DebugEvents.ToggleDebug);
        expect(resetSpy).toHaveBeenCalled();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((service as any)._isInitialized).toBeFalse();
    });

    it('should return the correct debug status with isDebug', (done) => {
        service.isDebug.subscribe((isDebug) => {
            expect(isDebug).toBe(false);
            done();
        });
    });

    it('should handle multiple calls to init', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const debugListenerSpy = spyOn(service as any, 'debugListener');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any)._isInitialized = false;
        service.init();
        service.init(); // Call init again
        expect(debugListenerSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple calls to reset', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const resetSpy = spyOn(service as any, 'reset').and.callThrough();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).reset();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).reset();
        expect(resetSpy).toHaveBeenCalledTimes(2);
    });
});
