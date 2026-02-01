import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ActiveGridService } from '@app/services/active-grid/active-grid.service';
import { CombatService } from '@app/services/combat/combat.service';
import { AVATARS } from '@common/avatar';
import { BASE_STAT, MAX_ESCAPE_ATTEMPTS, MS_IN_SECOND } from '@common/constants';
import { MOCK_BOARD, MOCK_PLAYERS } from '@common/constants.spec';
import { BoardCell, CombatUpdate, Player, Stats } from '@common/interfaces';
import { BehaviorSubject, of } from 'rxjs';
import { VsPopUpComponent } from './vs-pop-up.component';
import { CombatResults } from '@common/enums';
/* eslint-disable max-lines */

describe('VsPopUpComponent', () => {
    let component: VsPopUpComponent;
    let fixture: ComponentFixture<VsPopUpComponent>;
    let mockCombatService: jasmine.SpyObj<CombatService>;
    let mockActiveGridService: jasmine.SpyObj<ActiveGridService>;

    const mockBoard: BoardCell[][] = MOCK_BOARD;

    beforeEach(() => {
        const initiator = { ...MOCK_PLAYERS[0], stats: { ...MOCK_PLAYERS[0].stats } };
        const attacked = { ...MOCK_PLAYERS[1], stats: { ...MOCK_PLAYERS[1].stats } };
        mockCombatService = jasmine.createSpyObj('CombatService', ['getCombatWinner', 'notifyAnimationComplete'], {
            combatInitiator: initiator,
            attackedPlayer: attacked,
            escapeAttemptsUpdated: of({ playerId: '1' }),
            diceRoll: new BehaviorSubject({ message: CombatResults.CombatStarted, defenseRoll: 5, attackRoll: 6, defendingPlayerId: '1' }),
            combatUpdateData: {
                gameState: {
                    combat: {
                        attacker: '1',
                    },
                },
            },
        });

        mockCombatService.getCombatWinner.and.returnValue(of(initiator.id));

        mockActiveGridService = jasmine.createSpyObj('ActiveGridService', [], {
            grid$: of({ board: mockBoard }),
        });

        TestBed.configureTestingModule({
            imports: [VsPopUpComponent],
            providers: [
                { provide: CombatService, useValue: mockCombatService },
                { provide: ActiveGridService, useValue: mockActiveGridService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(VsPopUpComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('initiateFight', () => {
        it('should initialize combat state and check ice tiles', () => {
            const icePlayer = {
                ...MOCK_PLAYERS[0],
                position: { x: 0, y: 1 },
                isIceApplied: undefined,
            };
            const normalPlayer = {
                ...MOCK_PLAYERS[1],
                position: { x: 1, y: 0 },
                isIceApplied: undefined,
            };

            Object.defineProperty(mockCombatService, 'combatInitiator', { get: () => icePlayer });
            Object.defineProperty(mockCombatService, 'attackedPlayer', { get: () => normalPlayer });

            component.initiateFight();

            expect(icePlayer.position.y).toBe(1);
            expect(normalPlayer.position.y).toBe(0);

            expect(icePlayer.isIceApplied).toBeTrue();
            expect(normalPlayer.isIceApplied).toBeFalse();
            expect(component.isVisible).toBeTrue();
        });

        it('should handle undefined players', () => {
            Object.defineProperty(mockCombatService, 'combatInitiator', { get: () => undefined });
            Object.defineProperty(mockCombatService, 'attackedPlayer', { get: () => undefined });

            component.initiateFight();

            expect(component.combatInitiator).toBeUndefined();
            expect(component.attackedPlayer).toBeUndefined();
            expect(component.isVisible).toBeTrue();
        });
    });

    describe('endFight', () => {
        beforeEach(() => {
            component.initiateFight();
        });
        it('should reset all combat state', fakeAsync(() => {
            component.endFight();
            tick(MS_IN_SECOND);
            expect(component.combatInitiator).toBeUndefined();
            expect(component.attackedPlayer).toBeUndefined();
            expect(component.isVisible).toBeFalse();
            expect(component.initiatorDiceRoll).toBe('-');
            expect(component.attackedDiceRoll).toBe('-');
        }));

        it('should set combaInitior life to 0 if he loses', () => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            component['_winnerId'] = component.attackedPlayer!.id;
            component.endFight();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(component.combatInitiator!.stats!.life).toBe(0);
        });
    });

    describe('rolePlayer', () => {
        it('should return correct role for attacker', () => {
            const player = { id: '1' } as Player;
            expect(component.rolePlayer(player)).toBe('Attaquant:');
        });

        it('should return correct role for defender', () => {
            const player = { id: '2' } as Player;
            expect(component.rolePlayer(player)).toBe('Defenseur:');
        });

        it('should return empty string for undefined player', () => {
            expect(component.rolePlayer(undefined)).toBe('');
        });
    });

    describe('getAvatarIdleAnimation', () => {
        it('should return correct animation for known avatar', () => {
            const avatarName = 'Yang';
            const avatar = AVATARS.find((a) => a.name === avatarName);
            expect(avatar).toBeDefined();
            if (avatar) {
                expect(component.getAvatarIdleAnimation(avatarName)).toBe(avatar.combatIdle as string);
            }
        });

        it('should return default animation for unknown avatar', () => {
            expect(component.getAvatarIdleAnimation(undefined)).toBe('assets/avatar_combat/avatar_idle/archer.gif');
            expect(component.getAvatarIdleAnimation('unknown')).toBe('assets/avatar_combat/avatar_idle/archer.gif');
        });
    });

    describe('getAvatarAttackAnimation', () => {
        it('should return correct animation for known avatar', () => {
            const avatarName = 'Yang';
            const avatar = AVATARS.find((a) => a.name === avatarName);
            expect(avatar).toBeDefined();
            if (avatar) {
                expect(component.getAvatarAttackAnimation(avatarName)).toBe(avatar.attack as string);
            }
        });

        it('should return default animation for undefined avatar name', () => {
            expect(component.getAvatarAttackAnimation(undefined)).toBe('assets/avatar_combat/avatar_attack/archer.gif');
        });

        it('should return default animation for unknown avatar name', () => {
            expect(component.getAvatarAttackAnimation('unknown')).toBe('assets/avatar_combat/avatar_attack/archer.gif');
        });
    });

    describe('isPlayerOnIceTile', () => {
        it('should return true for player on ice tile', () => {
            const player = {
                stats: { life: BASE_STAT, defense: BASE_STAT, speed: BASE_STAT, attack: BASE_STAT },
                position: { x: 0, y: 1 },
            } as Player;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = (component as any).isPlayerOnIceTile(player);
            expect(result).toBeTrue();
        });

        it('should return false for player on normal tile', () => {
            const player = {
                stats: { life: BASE_STAT, defense: BASE_STAT, speed: BASE_STAT, attack: BASE_STAT },
                position: { x: 0, y: 0 },
            } as Player;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = (component as any).isPlayerOnIceTile(player);
            expect(result).toBeFalse();
        });

        it('should return false for player with no position', () => {
            const player = { stats: { life: BASE_STAT, defense: BASE_STAT, speed: BASE_STAT, attack: BASE_STAT } } as Player;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = (component as any).isPlayerOnIceTile(player);
            expect(result).toBeFalse();
        });
    });

    describe('updateEscapeAttempts', () => {
        beforeEach(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (component as any)._combatInitiator = undefined;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (component as any)._attackedPlayer = undefined;
        });

        describe('when initiator tries to escape', () => {
            it('should decrement attacked player attempts when defined', () => {
                const initiator = { id: '1' } as Player;
                const attacked = { id: '2', escapeAttempts: MAX_ESCAPE_ATTEMPTS } as Player;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (component as any)._combatInitiator = initiator;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (component as any)._attackedPlayer = attacked;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (component as any).updateEscapeAttempts('1');

                expect(attacked.escapeAttempts).toBe(1);
            });

            it('should initialize to MAX-1 when attacked player attempts undefined', () => {
                const initiator = { id: '1' } as Player;
                const attacked = { id: '2' } as Player;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (component as any)._combatInitiator = initiator;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (component as any)._attackedPlayer = attacked;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (component as any).updateEscapeAttempts('1');

                expect(attacked.escapeAttempts).toBe(MAX_ESCAPE_ATTEMPTS - 1);
            });
        });

        describe('when attacked player tries to escape', () => {
            it('should decrement initiator attempts when defined', () => {
                const initiator = { id: '1', escapeAttempts: 2 } as Player;
                const attacked = { id: '2' } as Player;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (component as any)._combatInitiator = initiator;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (component as any)._attackedPlayer = attacked;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (component as any).updateEscapeAttempts('2');

                expect(initiator.escapeAttempts).toBe(1);
            });

            it('should initialize to MAX-1 when initiator attempts undefined', () => {
                const initiator = { id: '1' } as Player;
                const attacked = { id: '2' } as Player;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (component as any)._combatInitiator = initiator;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (component as any)._attackedPlayer = attacked;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (component as any).updateEscapeAttempts('2');

                expect(initiator.escapeAttempts).toBe(MAX_ESCAPE_ATTEMPTS - 1);
            });
        });
    });

    describe('ngOnDestroy', () => {
        it('should unsubscribe from all subscriptions', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-non-null-assertion
            const spyGrid = spyOn((component as any).gridSubscription!, 'unsubscribe');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-non-null-assertion
            const spyEscape = spyOn((component as any).escapeAttemptsSubscription!, 'unsubscribe');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-non-null-assertion
            const spyDice = spyOn((component as any).diceRollSubscription!, 'unsubscribe');

            component.ngOnDestroy();

            expect(spyGrid).toHaveBeenCalled();
            expect(spyEscape).toHaveBeenCalled();
            expect(spyDice).toHaveBeenCalled();
        });

        it('should clear attack animation timeout if it exists', () => {
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers, @typescript-eslint/no-empty-function
            component['_attackAnimationTimeout'] = window.setTimeout(() => {}, 1000);
            spyOn(window, 'clearTimeout');

            component.ngOnDestroy();

            expect(window.clearTimeout).toHaveBeenCalledWith(component['_attackAnimationTimeout']);
        });
    });

    describe('getters', () => {
        it('should return correct background path', () => {
            expect(component.backgroundPath).toBe('./assets/fire-background.gif');
        });

        it('should return correct ice debuff path', () => {
            expect(component.iceDebuff).toBe('./assets/ice-debuff.gif');
        });

        it('should return current dice rolls', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (component as any)._initiatorDiceRoll = 5;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (component as any)._attackedDiceRoll = 4;

            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            expect(component.initiatorDiceRoll).toBe(5);
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            expect(component.attackedDiceRoll).toBe(4);
        });

        describe('attacker', () => {
            it('should return undefined when no attacker is set', () => {
                component['_attacker'] = undefined;
                expect(component.attacker).toBeUndefined();
            });

            it('should return the current attacker when set', () => {
                const mockPlayer = { id: '1', name: 'Test Player' } as Player;
                component['_attacker'] = mockPlayer;
                expect(component.attacker).toBe(mockPlayer);
            });
        });

        describe('isAttacking', () => {
            it('should return false when not attacking', () => {
                component['_isAttacking'] = false;
                expect(component.isAttacking).toBeFalse();
            });

            it('should return true when attacking', () => {
                component['_isAttacking'] = true;
                expect(component.isAttacking).toBeTrue();
            });
        });
    });
    describe('handleDiceRoll', () => {
        let initiator: Player;
        let attacked: Player;
        let mockData: CombatUpdate;

        beforeEach(() => {
            initiator = {
                id: '1',
                stats: { life: 10, attack: 5, defense: 5 } as Stats,
            } as Player;

            attacked = {
                id: '2',
                stats: { life: 10, attack: 5, defense: 5 } as Stats,
            } as Player;

            component['_combatInitiator'] = initiator;
            component['_attackedPlayer'] = attacked;
        });

        it('should start attack animation and notify completion when attack is not defeated', fakeAsync(() => {
            const mockPlayer = {
                id: '2',
                avatar: 'Yang',
                stats: { life: 10 },
            } as Player;

            mockData = {
                message: CombatResults.AttackNotDefeated,
                gameState: {
                    players: [initiator, mockPlayer],
                    combat: {
                        defender: '2',
                        attacker: '1',
                    },
                },
            } as CombatUpdate;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            spyOn(component as any, 'startAttackAnimation').and.returnValue(Promise.resolve());

            component['handleDiceRoll'](mockData);
            tick();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((component as any).startAttackAnimation).toHaveBeenCalledWith(mockPlayer);
            expect(mockCombatService.notifyAnimationComplete).toHaveBeenCalled();
        }));

        it('should not start animation when defender player is not found', fakeAsync(() => {
            mockData = {
                message: CombatResults.AttackNotDefeated,
                gameState: {
                    players: [] as Player[],
                    combat: {
                        defender: 'non-existent-id',
                        attacker: 'attacker-id',
                    },
                },
            } as CombatUpdate;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            spyOn(component as any, 'startAttackAnimation');

            component['handleDiceRoll'](mockData);
            tick();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((component as any).startAttackAnimation).not.toHaveBeenCalled();
            expect(component['combatService'].notifyAnimationComplete).not.toHaveBeenCalled();
        }));

        it('should set correct dice rolls when initiator is attacker', () => {
            mockData = {
                diceAttack: 6,
                diceDefense: 4,
                gameState: {
                    players: [initiator, attacked],
                    combat: { attacker: initiator.id },
                },
            } as CombatUpdate;

            component['handleDiceRoll'](mockData);
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            expect(component.initiatorDiceRoll).toBe(4);
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            expect(component.attackedDiceRoll).toBe(6);
            expect(component.isInitiatorAttacker).toBeTrue();
        });

        it('should set correct dice rolls when attacked is attacker', () => {
            mockData = {
                diceAttack: 5,
                diceDefense: 3,
                gameState: {
                    players: [initiator, attacked],
                    combat: { attacker: attacked.id },
                },
            } as CombatUpdate;

            component['handleDiceRoll'](mockData);
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            expect(component.initiatorDiceRoll).toBe(5);
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            expect(component.attackedDiceRoll).toBe(3);
            expect(component.isInitiatorAttacker).toBeFalse();
        });

        it('should update player stats when initiator is attacker', () => {
            mockData = {
                diceAttack: 6,
                diceDefense: 4,
                attack: 7,
                defense: 3,
                gameState: {
                    players: [initiator, attacked],
                    combat: { attacker: initiator.id },
                },
            } as CombatUpdate;

            component['handleDiceRoll'](mockData);
            // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-magic-numbers
            expect(initiator.stats!.defense).toBe(3);
            // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-magic-numbers
            expect(attacked.stats!.attack).toBe(7);
        });

        it('should update player stats when attacked is attacker', () => {
            mockData = {
                diceAttack: 5,
                diceDefense: 3,
                attack: 6,
                defense: 2,
                gameState: {
                    players: [initiator, attacked],
                    combat: { attacker: attacked.id },
                },
            } as CombatUpdate;

            component['handleDiceRoll'](mockData);
            // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-magic-numbers
            expect(initiator.stats!.attack).toBe(6);
            // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
            expect(attacked.stats!.defense).toBe(2);
        });

        it('should update player life from game state', () => {
            const updatedInitiator = { ...initiator, stats: { ...initiator.stats, life: 8 } };
            const updatedAttacked = { ...attacked, stats: { ...attacked.stats, life: 7 } };

            mockData = {
                gameState: {
                    players: [updatedInitiator, updatedAttacked],
                    combat: { attacker: initiator.id },
                },
            } as CombatUpdate;

            component['handleDiceRoll'](mockData);
            mockCombatService.diceRoll.next({
                message: CombatResults.AttackDefeated,
                defenseRoll: 3,
                attackRoll: 5,
                defendingPlayerId: '2',
            } as unknown as CombatUpdate);
            // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-magic-numbers
            expect(initiator.stats!.life).toBe(8);
            // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-magic-numbers
            expect(attacked.stats!.life).toBe(7);
        });

        it('should handle undefined gameState gracefully', () => {
            mockData = {
                diceAttack: 2,
                diceDefense: 1,
            } as CombatUpdate;

            expect(async () => component['handleDiceRoll'](mockData)).not.toThrow();
        });
    });

    describe('startAttackAnimation', () => {
        it('should start and complete attack animation', fakeAsync(() => {
            const mockPlayer = { avatar: 'Yang' } as Player;
            const mockAvatar = AVATARS.find((a) => a.name === mockPlayer.avatar);

            const promise = component['startAttackAnimation'](mockPlayer);
            expect(component['_isAttacking']).toBeTrue();
            expect(component['_attacker']).toBe(mockPlayer);
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            tick(mockAvatar?.attackDuration || 2000);

            promise.then(() => {
                expect(component['_isAttacking']).toBeFalse();
                expect(component['_attacker']).toBeUndefined();
            });
        }));

        it('should clear existing timeout before starting new animation', fakeAsync(() => {
            const mockPlayer = { avatar: 'Yang' } as Player;
            const mockAvatar = AVATARS.find((a) => a.name === mockPlayer.avatar);

            component['_attackAnimationTimeout'] = 1234;
            spyOn(window, 'clearTimeout');

            component['startAttackAnimation'](mockPlayer);
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            expect(window.clearTimeout).toHaveBeenCalledWith(1234);
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            tick(mockAvatar?.attackDuration || 2000);
        }));

        it('should use default duration when avatar not found', fakeAsync(() => {
            const mockPlayer = { avatar: 'Unknown' } as Player;

            const promise = component['startAttackAnimation'](mockPlayer);
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            tick(2000);

            promise.then(() => {
                expect(component['_isAttacking']).toBeFalse();
            });
        }));
    });
});
