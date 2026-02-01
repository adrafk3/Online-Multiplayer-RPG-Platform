import { TestBed } from '@angular/core/testing';
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { Router, NavigationStart } from '@angular/router';
import { Subject } from 'rxjs';
import { AlertService } from './alert.service';
import { SNACKBAR_TIME } from '@common/constants';
import { MatDialog } from '@angular/material/dialog';
import { TileTypes } from '@common/enums';
import { WinnerAnnouncementComponent } from '@app/components/winner-announcement-popup/winner-announcement-popup.component';

describe('AlertService', () => {
    let service: AlertService;
    let snackBarMock: jasmine.SpyObj<MatSnackBar>;
    let routerMock: jasmine.SpyObj<Router>;
    let routerEvents: Subject<unknown>;
    let snackBarRefMock: jasmine.SpyObj<MatSnackBarRef<TextOnlySnackBar>>;
    let dialogMock: jasmine.SpyObj<MatDialog>;

    beforeEach(() => {
        snackBarRefMock = jasmine.createSpyObj('MatSnackBarRef', ['dismiss']);
        snackBarMock = jasmine.createSpyObj('MatSnackBar', ['open', 'dismiss']);
        snackBarMock.open.and.returnValue(snackBarRefMock);
        routerEvents = new Subject();
        routerMock = jasmine.createSpyObj('Router', [], { events: routerEvents.asObservable() });
        dialogMock = jasmine.createSpyObj('MatDialog', ['closeAll', 'open']);

        TestBed.configureTestingModule({
            providers: [
                AlertService,
                { provide: MatSnackBar, useValue: snackBarMock },
                { provide: Router, useValue: routerMock },
                { provide: MatDialog, useValue: dialogMock },
            ],
        });
        service = TestBed.inject(AlertService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should open snackbar when alert is called with string', () => {
        service.alert('Test message');
        expect(snackBarMock.open).toHaveBeenCalledWith('Test message', 'Fermer', {
            panelClass: ['error-snackbar'],
            verticalPosition: 'top',
        });
    });

    it('should open snackbar when alert is called with object', () => {
        const object = { message: 'hello' };
        service.alert(object);
        expect(snackBarMock.open).toHaveBeenCalledWith('{"message":"hello"}', 'Fermer', {
            panelClass: ['error-snackbar'],
            verticalPosition: 'top',
        });
    });

    it('should dismiss snackbar on NavigationStart event', () => {
        routerEvents.next(new NavigationStart(1, ''));
        expect(snackBarMock.dismiss).toHaveBeenCalled();
    });

    it('should not dismiss snackbar on non-NavigationStart events', () => {
        routerEvents.next({ id: 1, url: '' });
        expect(snackBarMock.dismiss).not.toHaveBeenCalled();
    });

    it('should open snackbar with correct parameters when notify is called with string', () => {
        service.notify('Test notify message');
        expect(snackBarMock.open).toHaveBeenCalledWith('Test notify message', 'Fermer', {
            panelClass: ['settings-tooltip'],
            verticalPosition: 'top',
            duration: SNACKBAR_TIME,
        });
    });

    it('should open snackbar with correct parameters when notify is called with object', () => {
        const object = { message: 'notification' };
        service.notify(JSON.stringify(object));
        expect(snackBarMock.open).toHaveBeenCalledWith('{"message":"notification"}', 'Fermer', {
            panelClass: ['settings-tooltip'],
            verticalPosition: 'top',
            duration: SNACKBAR_TIME,
        });
    });

    it('should announce a winner message', () => {
        service.announceWinner('Winner');
        expect(dialogMock.closeAll).toHaveBeenCalled();
        expect(dialogMock.open).toHaveBeenCalledWith(WinnerAnnouncementComponent, {
            data: { message: 'Winner' },
            hasBackdrop: false,
            disableClose: false,
        });
    });

    describe('tileInfo', () => {
        it('should replace message with TILE_INFO value if message is a valid TileTypes', () => {
            const mockMessage = {
                tile: TileTypes.Ice,
            };
            const mockEvent = { clientX: 100, clientY: 200 } as MouseEvent;

            service.tileInfo(mockMessage, mockEvent);
            expect(dialogMock.closeAll).toHaveBeenCalled();
            expect(dialogMock.open).toHaveBeenCalled();
        });

        it('should adjust topPosition to avoid overflow when popup would go off-screen', () => {
            const screenHeight = 800;
            const clientY = 780;

            // @ts-ignore override global window height
            spyOnProperty(window, 'innerHeight').and.returnValue(screenHeight);

            const mockMessage = {
                tile: TileTypes.Ice,
            };

            const mockEvent = {
                clientX: 150,
                clientY,
            } as MouseEvent;

            service.tileInfo(mockMessage, mockEvent);

            expect(dialogMock.open).toHaveBeenCalled();
        });

        it('should pass message as-is if it is not a valid TileTypes', () => {
            const mockMessage = {
                tile: TileTypes.Ice,
            };
            const mockEvent = { clientX: 100, clientY: 200 } as MouseEvent;

            service.tileInfo(mockMessage, mockEvent);

            expect(dialogMock.closeAll).toHaveBeenCalled();
            expect(dialogMock.open).toHaveBeenCalled();
        });

        it('should call closeAll before opening the popup', () => {
            const mockMessage = {
                tile: TileTypes.Ice,
            };
            const mockEvent = { clientX: 100, clientY: 200 } as MouseEvent;

            service.tileInfo(mockMessage, mockEvent);

            expect(dialogMock.closeAll).toHaveBeenCalledBefore(dialogMock.open);
        });
    });
});
