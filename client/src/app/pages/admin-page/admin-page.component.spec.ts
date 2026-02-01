import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '@app/services/admin-service/admin-service';
import { Game } from '@common/types';
import { of, throwError } from 'rxjs';
import { AdminPageComponent } from './admin-page.component';

describe('AdminPageComponent', () => {
    let component: AdminPageComponent;
    let fixture: ComponentFixture<AdminPageComponent>;
    let adminServiceSpy: jasmine.SpyObj<AdminService>;
    let mockGames: Game[];
    let routerSpy: jasmine.SpyObj<Router>;
    let mockGame: Game;

    beforeEach(async () => {
        const adminServiceMock = jasmine.createSpyObj('AdminService', ['getAllGames', 'getGameById', 'updateVisibility', 'deleteGame', 'fixHour']);

        routerSpy = jasmine.createSpyObj('Router', ['navigate']);

        mockGames = [
            { _id: '1', name: 'Game 1', gameMode: 'Classic', gridSize: 10, isHidden: false, imagePayload: '', description: '', lastModified: '' },
            { _id: '2', name: 'Game 2', gameMode: 'CTF', gridSize: 15, isHidden: false, imagePayload: '', description: '', lastModified: '' },
            { _id: '3', name: 'Game 3', gameMode: 'Classic', gridSize: 20, isHidden: true, imagePayload: '', description: '', lastModified: '' },
        ];
        mockGame = {
            _id: '1',
            name: 'Test Game',
            gameMode: 'Classic',
            gridSize: 10,
            isHidden: false,
            imagePayload: '',
            description: '',
            lastModified: '2024-02-09T12:34:56Z',
        };

        adminServiceMock.getAllGames.and.returnValue(of([]));

        const activatedRouteMock = {
            snapshot: {
                params: {},
                queryParams: {},
            },
        };

        await TestBed.configureTestingModule({
            imports: [AdminPageComponent],
            providers: [
                { provide: AdminService, useValue: adminServiceMock },
                { provide: ActivatedRoute, useValue: activatedRouteMock },
                { provide: Router, useValue: routerSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(AdminPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        adminServiceSpy = TestBed.inject(AdminService) as jasmine.SpyObj<AdminService>;
        adminServiceSpy.fixHour.and.callFake((date: string | null | undefined) => {
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            return date ? date.replace('T', ' ').slice(0, 19) : 'N/A';
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (component as any).games = mockGames;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('fetchGames', () => {
        it('should fetch and populate games', () => {
            adminServiceSpy.getAllGames.and.returnValue(of(mockGames));
            component.fetchGames();
            expect(adminServiceSpy.getAllGames).toHaveBeenCalled();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((component as any).games).toEqual(mockGames);
        });
        it('should log an error if fetching games fails', () => {
            const errorMessage = 'Failed to fetch';
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (component as any)._errorMessage = '';
            adminServiceSpy.getAllGames.and.returnValue(throwError(() => new Error(errorMessage)));
            component.fetchGames();

            expect(adminServiceSpy.getAllGames).toHaveBeenCalled();
            expect(component.errorMessage.toString()).toBe('Error: ' + errorMessage);
        });
    });

    describe('filteredGames', () => {
        it('should filter games by mode', () => {
            const resultClassic = component.filteredGames('Classic');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect(resultClassic).toEqual([(component as any).games[0], (component as any).games[2]]);
            const resultCTF = component.filteredGames('CTF');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect(resultCTF).toEqual([(component as any).games[1]]);
        });
    });

    describe('onEditGame', () => {
        it('should store the game in sessionStorage when editing', fakeAsync(() => {
            spyOn(sessionStorage, 'setItem');

            for (let i = 0; i < mockGames.length; i++) {
                adminServiceSpy.getGameById.and.returnValue(of(mockGames[i]));

                component.onEditGame(`${i + 1}`);
                tick();

                expect(adminServiceSpy.getGameById).toHaveBeenCalledWith(`${i + 1}`);
                expect(sessionStorage.setItem).toHaveBeenCalledWith('gameToEdit', JSON.stringify(mockGames[i]));
                expect(routerSpy.navigate).toHaveBeenCalledWith(['/map-editor']);
            }
        }));
        it('should set an error message if editing a game fails', fakeAsync(() => {
            const errorMessage = 'Failed to fetch game';

            for (let i = 0; i < mockGames.length; i++) {
                adminServiceSpy.getGameById.and.returnValue(throwError(() => new Error(errorMessage)));

                component.onEditGame(`${i + 1}`);
                tick();

                expect(adminServiceSpy.getGameById).toHaveBeenCalledWith(`${i + 1}`);
                expect(component.errorMessage).toBe('Error trying to edit game: ' + errorMessage);
                expect(routerSpy.navigate).not.toHaveBeenCalled();
            }
        }));
    });

    describe('onHideGame', () => {
        it('should toggle the visibility of a game', () => {
            adminServiceSpy.updateVisibility.and.returnValue(of(undefined));

            component.onHideGame('1');
            component.onHideGame('3');

            expect(adminServiceSpy.updateVisibility).toHaveBeenCalledWith('1');
            expect(adminServiceSpy.updateVisibility).toHaveBeenCalledWith('3');
            expect(mockGames[0].isHidden).toBeTrue();
            expect(mockGames[2].isHidden).toBeFalse();
        });

        it('should do nothing if the game ID does not exist', () => {
            adminServiceSpy.updateVisibility.and.returnValue(of(undefined));
            component.onHideGame('invalid-id');
            expect(adminServiceSpy.updateVisibility).not.toHaveBeenCalled();
        });

        it('should set an error message if updating game visibility fails', () => {
            const errorMessage = 'Visibility update failed';

            for (let i = 0; i < mockGames.length; i++) {
                adminServiceSpy.updateVisibility.and.returnValue(throwError(() => new Error(errorMessage)));

                component.onHideGame(`${i + 1}`);

                expect(adminServiceSpy.updateVisibility).toHaveBeenCalledWith(`${i + 1}`);
                expect(component.errorMessage).toBe('Error updating game visibility: ' + errorMessage);
            }
        });
    });

    describe('onDeleteGame', () => {
        it('should delete a game', () => {
            adminServiceSpy.deleteGame.and.returnValue(of(undefined));

            component.onDeleteGame('2');

            expect(adminServiceSpy.deleteGame).toHaveBeenCalledWith('2');
        });
        it('should set an error message if deleting a game fails', () => {
            spyOn(component, 'fetchGames');
            const errorMessage = 'Deletion failed';

            for (let i = 0; i < mockGames.length; i++) {
                adminServiceSpy.deleteGame.and.returnValue(throwError(() => new Error(errorMessage)));

                component.onDeleteGame(`${i + 1}`);

                expect(adminServiceSpy.deleteGame).toHaveBeenCalledWith(`${i + 1}`);
                expect(component.errorMessage).toBe('Error deleting game:' + errorMessage);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                expect((component as any).games.length).toBe(mockGames.length);
                expect(component.fetchGames).toHaveBeenCalled();
            }
        });
    });
    describe('formatGame', () => {
        it('should format lastModified correctly when valid', () => {
            const formattedGame = component.formatGame(mockGame);
            expect(formattedGame.lastModified).toBe('2024-02-09 12:34:56');
        });

        it('should return N/A if lastModified is null or undefined', () => {
            mockGame.lastModified = null as unknown as string;
            const formattedGame = component.formatGame(mockGame);
            expect(formattedGame.lastModified).toBe('N/A');
        });
    });
});
