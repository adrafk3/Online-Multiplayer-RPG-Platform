import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminService } from '@app/services/admin-service/admin-service';
import { AlertService } from '@app/services/alert/alert.service';
import { PlayerService } from '@app/services/player/player.service';
import { SocketService } from '@app/services/socket/socket.service';
import { GameModes, GameSizes, Players } from '@common/enums';
import { HttpMessage } from '@common/http-message';
import { Game } from '@common/types';
import { of, throwError } from 'rxjs';
import { CardsComponent } from './cards.component';

describe('CardsComponent', () => {
    let component: CardsComponent;
    let fixture: ComponentFixture<CardsComponent>;
    let mockAdminService: jasmine.SpyObj<AdminService>;
    let mockPlayerService: jasmine.SpyObj<PlayerService>;
    let mockSocketService: jasmine.SpyObj<SocketService>;
    let mockAlertService: jasmine.SpyObj<AlertService>;

    beforeEach(async () => {
        spyOn(window, 'alert').and.callFake(() => {
            return;
        });
        mockAdminService = jasmine.createSpyObj('AdminService', ['getGameById']);
        mockPlayerService = jasmine.createSpyObj('PlayerService', ['createGame']);
        mockSocketService = jasmine.createSpyObj('SocketService', ['isConnected', 'connect', 'off']);
        mockAlertService = jasmine.createSpyObj('AlertService', ['alert']);

        await TestBed.configureTestingModule({
            imports: [CardsComponent],
            providers: [
                { provide: AdminService, useValue: mockAdminService },
                { provide: PlayerService, useValue: mockPlayerService },
                { provide: SocketService, useValue: mockSocketService },
                { provide: AlertService, useValue: mockAlertService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(CardsComponent);
        component = fixture.componentInstance;
        component.gameData = { _id: '1', gameMode: GameModes.CTF, gridSize: GameSizes.Small } as Game;
        mockSocketService.isConnected.and.returnValue(of(true));
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should set gameModeImage and maxPlayers on init', () => {
        expect(component.gameModeImage).toBe('assets/ctf.png');
        expect(component.maxPlayers).toBe(Players.SmallMap);
    });

    it('should return correct game mode image', () => {
        expect(component.getGameModeImage(GameModes.CTF)).toBe('assets/ctf.png');
        expect(component.getGameModeImage(GameModes.Classic)).toBe('assets/classic.png');
        expect(component.getGameModeImage('unknown')).toBe('assets/classic.png');
    });

    it('should return correct max players', () => {
        expect(component.getMaxPlayers(GameSizes.Small)).toBe(Players.SmallMap);
        expect(component.getMaxPlayers(GameSizes.Medium)).toBe(Players.MediumMap);
        expect(component.getMaxPlayers(GameSizes.Big)).toBe(Players.BigMap);
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        expect(component.getMaxPlayers(999)).toBe(Players.SmallMap);
    });

    it('should handle card click for visible game', () => {
        mockAdminService.getGameById.and.returnValue(of({ isHidden: false, _id: '1' } as Game));
        component.onCardClick();
        expect(mockPlayerService.createGame).toHaveBeenCalledWith('1');
    });

    it('should handle card click for hidden game', () => {
        mockAdminService.getGameById.and.returnValue(of({ isHidden: true } as Game));
        spyOn(component.gameUpdated, 'emit');
        component.onCardClick();
        expect(mockAlertService.alert).toHaveBeenCalledWith("Le jeu n'est plus visible.");
        expect(component.gameUpdated.emit).toHaveBeenCalled();
    });

    it('should handle not found error', () => {
        mockAdminService.getGameById.and.returnValue(throwError(() => ({ status: HttpMessage.NotFound })));
        spyOn(component.gameUpdated, 'emit');
        component.onCardClick();
        expect(mockAlertService.alert).toHaveBeenCalledWith("Le jeu n'existe plus.");
        expect(component.gameUpdated.emit).toHaveBeenCalled();
    });

    it('should handle other errors', () => {
        mockAdminService.getGameById.and.returnValue(throwError(() => 'Some error'));
        component.onCardClick();
        expect(mockAlertService.alert).toHaveBeenCalledWith('Some error');
    });
});
