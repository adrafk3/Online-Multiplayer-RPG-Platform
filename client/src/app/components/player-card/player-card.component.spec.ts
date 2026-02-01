import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerService } from '@app/services/player/player.service';
import { AVATARS } from '@common/avatar';
import { Player } from '@common/interfaces';
import { PlayerCardComponent } from './player-card.component';

describe('PlayerCardComponent', () => {
    let component: PlayerCardComponent;
    let fixture: ComponentFixture<PlayerCardComponent>;
    let mockPlayerService: jasmine.SpyObj<PlayerService>;

    beforeEach(async () => {
        spyOn(window, 'alert').and.callFake(() => {
            return;
        });
        mockPlayerService = jasmine.createSpyObj('PlayerService', [], {
            player: { isHost: false, name: 'TestPlayer' },
        });

        await TestBed.configureTestingModule({
            imports: [PlayerCardComponent],
            providers: [{ provide: PlayerService, useValue: mockPlayerService }],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayerCardComponent);
        component = fixture.componentInstance;
        component.player = { name: 'Player1', avatar: AVATARS[0].name } as Player;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should toggle confirmation visibility', () => {
        expect(component.isConfirmationVisible).toBeFalse();
        component.showConfirmation();
        expect(component.isConfirmationVisible).toBeTrue();
        component.showConfirmation();
        expect(component.isConfirmationVisible).toBeFalse();
    });

    it('should emit kick event and hide confirmation on confirm', () => {
        spyOn(component.kick, 'emit');
        component.isConfirmationVisible = true;
        component.onConfirmKick();
        expect(component.kick.emit).toHaveBeenCalled();
        expect(component.isConfirmationVisible).toBeFalse();
    });

    it('should hide confirmation on cancel', () => {
        component.isConfirmationVisible = true;
        component.onCancelKick();
        expect(component.isConfirmationVisible).toBeFalse();
    });

    it('should get correct icon', () => {
        const icon = component.getIcon();
        expect(icon).toBe(AVATARS[0].image);
    });

    it('should return undefined for non-existent avatar', () => {
        component.player.avatar = 'NonExistentAvatar';
        const icon = component.getIcon();
        expect(icon).toBeUndefined();
    });

    it('should check if current player is host', () => {
        expect(component.isHost()).toBeFalse();
        mockPlayerService.player.isHost = true;
        expect(component.isHost()).toBeTrue();
    });

    it('should check if player is current user', () => {
        expect(component.isCurrentUser()).toBeFalse();
        component.player.name = 'TestPlayer';
        expect(component.isCurrentUser()).toBeTrue();
    });
});
