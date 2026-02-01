import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { PopUpData } from '@app/interfaces/popUp.interface';
import { TILE_INFO } from '@app/constants/tile-info-const';
import { DebugService } from '@app/services/debug-service/debug-service.service';
import { AVATARS } from '@common/avatar';
import { MOCK_PLAYERS, MOCK_ROOM } from '@common/constants.spec';
import { Subject } from 'rxjs';
import { RightClickPopupComponent } from './right-click-popup.component';
import { ItemId } from '@common/enums';

describe('RightClickPopupComponent', () => {
    let component: RightClickPopupComponent;
    let fixture: ComponentFixture<RightClickPopupComponent>;
    let mockPlayer = { ...MOCK_PLAYERS[0] };
    let debugService: jasmine.SpyObj<DebugService>;
    let dialogRefSpy: jasmine.SpyObj<MatDialogRef<RightClickPopupComponent>>;

    beforeEach(async () => {
        mockPlayer = { ...MOCK_PLAYERS[0] };
        debugService = jasmine.createSpyObj('DebugService', [], { isDebug: new Subject<boolean>() });
        dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

        await TestBed.configureTestingModule({
            imports: [MatDialogModule],
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: mockPlayer },
                { provide: MatDialogRef, useValue: dialogRefSpy },
                { provide: DebugService, useValue: debugService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(RightClickPopupComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should correctly set the displayText', () => {
        const mockData = {
            player: MOCK_PLAYERS[0],
            item: MOCK_ROOM.map?.board[0][0].item,
            tileInfo: TILE_INFO.TuileDeBase,
        } as PopUpData;
        component.data = mockData;
        component.ngOnInit();
        expect(component.displayText).toBeDefined();
    });

    it('should correctly set the displayText if item is valid', () => {
        const mockData = {
            player: MOCK_PLAYERS[0],
            item: { ...MOCK_ROOM.map?.board[0][0].item, description: ItemId.Item1 },
            tileInfo: TILE_INFO.TuileDeBase,
        } as PopUpData;
        component.data = mockData;
        component.ngOnInit();
        expect(component.displayText).toBeDefined();
    });

    it('should correctly set the displayText if item is a starting point', () => {
        const mockData = {
            player: MOCK_PLAYERS[0],
            item: { ...MOCK_ROOM.map?.board[0][0].item, name: ItemId.ItemStartingPoint },
            tileInfo: TILE_INFO.TuileDeBase,
        } as PopUpData;
        component.data = mockData;
        component.ngOnInit();

        const mockString = `Joueur:\n ${mockData.player?.name}\n` + `${mockData.tileInfo}\n`;

        expect(component.displayText).toBe(mockString);
    });

    it('should close the dialog when onClose is called', () => {
        component.onClose();
        expect(dialogRefSpy.close).toHaveBeenCalled();
    });

    it('should close the dialog when backdrop is clicked', () => {
        component.onBackdropClick();
        expect(dialogRefSpy.close).toHaveBeenCalled();
    });

    it('should return AVATARS[0].icon when player.avatar is undefined', () => {
        const player = { ...mockPlayer, avatar: undefined };
        expect(component.getPlayerImage(player)).toBe(AVATARS[0].icon);
    });

    describe('getPlayerImage', () => {
        it('should return the default avatar image when player.avatar does not match any avatar name', () => {
            const wrongPlayer = {
                ...mockPlayer,
                avatar: 'WrongAvatarName',
            };

            expect(component.getPlayerImage(wrongPlayer)).toBe(AVATARS[0].icon);
        });

        it('should return the default avatar image when player.avatar is undefined', () => {
            const wrongPlayer = {
                ...mockPlayer,
                avatar: undefined,
            };

            expect(component.getPlayerImage(wrongPlayer)).toBe(AVATARS[0].icon);
        });
    });

    describe('DebugService subscription', () => {
        it('should close the dialog when debugService emits true', () => {
            const isDebugSubject = debugService.isDebug as unknown as Subject<boolean>;
            isDebugSubject.next(true);
            expect(dialogRefSpy.close).toHaveBeenCalled();
        });

        it('should not close the dialog when debugService emits false', () => {
            const isDebugSubject = debugService.isDebug as unknown as Subject<boolean>;
            isDebugSubject.next(false);
            expect(dialogRefSpy.close).not.toHaveBeenCalled();
        });
    });
});
