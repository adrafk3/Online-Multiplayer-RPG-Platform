import { GameRoomService } from '@app/services/game-room/game-room.service';
import { ItemService } from '@app/services/items/items.service';
import { VirtualPlayerService } from '@app/services/virtual-player/virtual-player-service/virtual-player.service';
import { BASE_STAT, ESCAPE_PERCENTAGE, ICE_DEBUFF, MAX_ESCAPE_ATTEMPTS } from '@common/constants';
import { Actions, CombatResults, TileTypes } from '@common/enums';
import { Player } from '@common/interfaces';
import { Position } from '@common/types';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CombatService {
    constructor(
        private gameRoomService: GameRoomService,
        private virtualPlayerService: VirtualPlayerService,
        private itemService: ItemService,
    ) {}

    handleStartCombat(playerId: string, roomId: string, target?: Player) {
        if (target && target.id !== playerId) {
            return this.startCombat(playerId, target.id, roomId);
        } else {
            return { message: 'Erreur lors du debut de combat' };
        }
    }

    startCombat(attackerId: string, defenderId: string, roomId: string) {
        const room = this.gameRoomService.rooms.get(roomId);
        const attacker = room.players.find((p) => p.id === attackerId);
        const defender = room.players.find((p) => p.id === defenderId);
        room.gameState = { players: [attacker, defender] };

        attacker.playerStats.nCombats++;
        defender.playerStats.nCombats++;

        const firstTurnPlayer =
            attacker.stats.maxSpeed > defender.stats.maxSpeed
                ? attackerId
                : defender.stats.maxSpeed > attacker.stats.maxSpeed
                ? defenderId
                : attackerId;
        const playerToFind = [attacker, defender].find((player) => player.id === firstTurnPlayer);
        if (playerToFind.type) {
            this.virtualPlayerService.combatAnswer(playerToFind, roomId);
        }
        const secondTurnPlayer = firstTurnPlayer === attackerId ? defenderId : attackerId;

        room.gameState.combat = {
            attacker: firstTurnPlayer,
            defender: secondTurnPlayer,
            turn: firstTurnPlayer,
            initialStats: {
                attacker: firstTurnPlayer === attackerId ? { ...attacker.stats } : { ...defender.stats },
                defender: secondTurnPlayer === attackerId ? { ...attacker.stats } : { ...defender.stats },
            },
        };
        this.isIce(attacker.id, roomId);
        this.isIce(defender.id, roomId);
        attacker.isReviveUsed = false;
        defender.isReviveUsed = false;

        return { message: CombatResults.CombatStarted, gameState: room.gameState };
    }

    findNextPlayerPosition(newStartingPosition: Position, roomId: string): Position | null {
        if (!newStartingPosition) return null;
        const players = this.gameRoomService.getPlayers(roomId);

        const isCurrentPositionOccupied = players.some((p) => {
            const cell = p.position;
            return cell.x === newStartingPosition.x && cell.y === newStartingPosition.y;
        });

        if (!isCurrentPositionOccupied) {
            return newStartingPosition;
        }
        const directions = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 },
        ];

        for (const direction of directions) {
            const newX = newStartingPosition.x + direction.x;
            const newY = newStartingPosition.y + direction.y;
            const position: Position = { x: newX, y: newY };
            if (this.isValidPosition(position, roomId)) {
                const isOccupied = players.some((p) => {
                    const cell = p.position;
                    return cell.x === newX && cell.y === newY;
                });

                if (!isOccupied) {
                    return { x: newX, y: newY };
                }
            }
        }
        return newStartingPosition;
    }

    processCombatAction(action: Actions.Attack | Actions.Escape, roomId: string) {
        const room = this.gameRoomService.rooms.get(roomId);
        const combat = room.gameState.combat;
        if (!combat) {
            return;
        }
        const attacker = room.players.find((p) => p.id === combat.attacker);
        const defender = room.players.find((p) => p.id === combat.defender);

        if (action === Actions.Attack) {
            return this.handleAttack(attacker, defender, roomId);
        } else if (action === Actions.Escape) {
            return this.handleEscape(attacker, defender, roomId);
        }
    }

    handleAttack(attacker: Player, defender: Player, roomId: string) {
        const room = this.gameRoomService.rooms.get(roomId);
        const combat = room.gameState.combat;
        const attackResult = this.attack(attacker, defender, roomId);
        if (attackResult.damage < 0) {
            attacker.playerStats.hpDealt += Math.abs(attackResult.damage);
            defender.playerStats.hpLost += Math.abs(attackResult.damage);
        }
        if (this.itemService.applyRevive(roomId, defender.id) && !defender.isReviveUsed && attackResult.attackResult < 0) {
            defender.stats.life = 1;
            defender.isReviveUsed = true;
            combat.attacker = defender.id;
            combat.defender = attacker.id;
            if (defender.type) {
                this.virtualPlayerService.combatAnswer(defender, roomId);
            }
            [combat.initialStats.attacker, combat.initialStats.defender] = [combat.initialStats.defender, combat.initialStats.attacker];
            combat.turn = defender.id;
            return {
                message: CombatResults.AttackNotDefeated,
                gameState: room.gameState,
                damage: attackResult.damage,
                diceAttack: attackResult.diceAttackValue,
                diceDefense: attackResult.diceDefenseValue,
                defense: attackResult.effectiveDefense,
                attack: attackResult.effectiveAttack,
            };
        } else if (attackResult.attackResult > 0) {
            defender.stats.life = attackResult.attackResult > defender.stats.maxLife ? defender.stats.maxLife : attackResult.attackResult;

            combat.attacker = defender.id;
            combat.defender = attacker.id;
            if (defender.type) {
                this.virtualPlayerService.combatAnswer(defender, roomId);
            }
            [combat.initialStats.attacker, combat.initialStats.defender] = [combat.initialStats.defender, combat.initialStats.attacker];
            combat.turn = defender.id;
            return {
                message: CombatResults.AttackNotDefeated,
                gameState: room.gameState,
                damage: attackResult.damage,
                diceAttack: attackResult.diceAttackValue,
                diceDefense: attackResult.diceDefenseValue,
                defense: attackResult.effectiveDefense,
                attack: attackResult.effectiveAttack,
            };
        } else {
            this.endCombat(roomId, attacker.id, defender.id);
            attacker.victories += 1;
            attacker.escapeAttempts = MAX_ESCAPE_ATTEMPTS;
            defender.escapeAttempts = MAX_ESCAPE_ATTEMPTS;
            return {
                message: CombatResults.AttackDefeated,
                gameState: room.gameState,
                finalDice: {
                    attack: attackResult.diceAttackValue,
                    defense: attackResult.diceDefenseValue,
                },
            };
        }
    }

    handleEscape(attacker: Player, defender: Player, roomId: string) {
        const room = this.gameRoomService.rooms.get(roomId);
        const combat = room.gameState.combat;
        const escapeCount = attacker.escapeAttempts > 0 ? attacker.escapeAttempts : MAX_ESCAPE_ATTEMPTS;
        const escapeResult = this.escape();
        attacker.escapeAttempts = escapeCount - 1;
        if (escapeResult.success) {
            attacker.playerStats.nEvasions++;
            attacker.escapeAttempts = MAX_ESCAPE_ATTEMPTS;
            defender.escapeAttempts = MAX_ESCAPE_ATTEMPTS;
            attacker.stats = combat.initialStats.attacker;
            defender.stats = combat.initialStats.defender;
            room.gameState.players = [attacker, defender];
            this.endCombat(roomId, null, null);
            return { message: CombatResults.EscapeSucceeded, gameState: room.gameState };
        } else {
            combat.attacker = defender.id;
            combat.defender = attacker.id;
            [combat.initialStats.attacker, combat.initialStats.defender] = [combat.initialStats.defender, combat.initialStats.attacker];
            combat.turn = defender.id;
            if (defender.type) {
                this.virtualPlayerService.combatAnswer(defender, roomId);
            }
            return { message: CombatResults.EscapeFailed, gameState: room.gameState };
        }
    }

    private isValidPosition(position: Position, roomId: string): boolean {
        const gridSize = this.gameRoomService.rooms.get(roomId).map.gridSize;
        return position.x >= 0 && position.x < gridSize && position.y >= 0 && position.y < gridSize;
    }

    private attack(attacker: Player, defender: Player, roomId: string) {
        let attackResult = 0;
        const room = this.gameRoomService.rooms.get(roomId);
        const combat = room.gameState.combat;
        const isDebug = room.isDebug;
        const initialDefenderLife = defender.stats.life;
        const oneDamageCap = this.itemService.applyPoison(roomId, defender.id);
        const daggerEffect = this.itemService.applyDagger(roomId, attacker.id);
        let effectiveAttack = attacker.stats.attack > BASE_STAT ? BASE_STAT : attacker.stats.attack;
        let effectiveDefense = Math.min(defender.stats.defense, BASE_STAT);
        const attackerStats = this.itemService.applyAttributesBuffs(roomId, attacker.id, {
            attack: effectiveAttack,
            defense: 0,
            life: 0,
            speed: 0,
        });
        const defenderStats = this.itemService.applyAttributesBuffs(roomId, defender.id, {
            attack: 0,
            defense: effectiveDefense,
            life: 0,
            speed: 0,
        });
        if (daggerEffect) {
            attackerStats.attack += 2;
        }
        if (oneDamageCap) {
            attackerStats.attack = 1;
        }
        const diceEffect = this.itemService.applyDiceEffect(roomId, attacker.id, combat.initialStats.attacker.attack);

        let diceAttackValue = this.rollDice(combat.initialStats.attacker.attack, isDebug, true);
        if (diceEffect && !isDebug) {
            diceAttackValue = diceEffect;
        }
        const diceDefenseValue = this.rollDice(combat.initialStats.defender.defense, isDebug, false);
        const damage = diceDefenseValue + defenderStats.defense - (diceAttackValue + attackerStats.attack);
        if (damage < 0) {
            attackResult = initialDefenderLife + damage;
        } else {
            attackResult = initialDefenderLife;
        }
        effectiveAttack = attackerStats.attack;
        effectiveDefense = defenderStats.defense;
        return {
            damage,
            attackResult,
            diceAttackValue,
            diceDefenseValue,
            effectiveDefense,
            effectiveAttack,
        };
    }

    private isIce(playerId: string, roomId: string) {
        const room = this.gameRoomService.rooms.get(roomId);
        const player = room.players.find((p) => p.id === playerId);

        if (!player || player.isIceApplied) {
            return;
        }
        const board = room.map.board;
        const playerPosition = player.position;
        if (board[playerPosition.x][playerPosition.y].tile === TileTypes.Ice) {
            player.stats.attack = BASE_STAT - ICE_DEBUFF;
            player.stats.defense = BASE_STAT - ICE_DEBUFF;
            player.isIceApplied = true;
            return;
        }
    }

    private rollDice(numDice: number, isDebug: boolean, isAttack: boolean): number {
        if (isDebug) return isAttack ? numDice : 1;
        return Math.floor(Math.random() * numDice) + 1;
    }

    private escape() {
        const escapeChance = Math.random() < ESCAPE_PERCENTAGE;
        return escapeChance ? { success: true } : { success: false };
    }

    private endCombat(roomId: string, winnerId: string | null, loserId: string | null) {
        const room = this.gameRoomService.rooms.get(roomId);
        const combat = room.gameState.combat;
        room.gameState.combat = undefined;
        room.gameState.isEscape = true;
        const attacker = room.gameState.players[0];
        const defender = room.gameState.players[1];
        attacker.stats = combat.initialStats.attacker;
        defender.stats = combat.initialStats.defender;
        attacker.isReviveUsed = false;
        defender.isReviveUsed = false;
        room.gameState.players.forEach((player) => {
            player.isIceApplied = false;
        });

        if (combat && winnerId && loserId) {
            const winner = room.players.find((p) => p.id === winnerId);
            const loser = room.players.find((p) => p.id === loserId);
            if (winner && loser) {
                const initialAttackerStats = combat.initialStats.attacker;
                const initialDefenderStats = combat.initialStats.defender;
                winner.playerStats.nVictories++;
                loser.playerStats.nDefeats++;

                winner.stats = initialAttackerStats;
                loser.stats = initialDefenderStats;
                room.gameState.players = [winner, loser];
                room.gameState.combat = undefined;
                room.gameState.isEscape = false;
            }
        }
    }
}
