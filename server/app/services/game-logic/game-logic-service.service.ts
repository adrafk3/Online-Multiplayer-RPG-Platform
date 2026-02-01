import { GameLogicGateway } from '@app/gateways/game-logic/game-logic.gateway';
import { ItemGateway } from '@app/gateways/items/items.gateway';
import { AttackResult, ItemPickup, MoveAction } from '@app/interfaces/game-logic-interfaces';
import { CombatService } from '@app/services/combat-logic/combat-logic.service';
import { GameModeService } from '@app/services/game-mode/game-mode.service';
import { MovementService } from '@app/services/movement-logic/movement-logic.service';
import { VirtualPlayerService } from '@app/services/virtual-player/virtual-player-service/virtual-player.service';
import { MOVEMENT_DELAY } from '@common/constants';
import { Directions, ItemId, ItemTypes } from '@common/enums';
import { ActiveGameEvents, CTFEvents } from '@common/gateway-events';
import { CombatAction, Player, RoomData } from '@common/interfaces';
import { createItem, findAvailableTerrainForItem } from '@common/shared-utils';
import { Position } from '@common/types';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

@Injectable()
export class GameLogicService implements OnModuleInit {
    private itemGateway: ItemGateway;
    private gameLogicGateway: GameLogicGateway;
    constructor(
        private combatService: CombatService,
        private moduleRef: ModuleRef,
        private gameModeService: GameModeService,
        private movementService: MovementService,
        private virtualPlayerService: VirtualPlayerService,
    ) {}
    onModuleInit() {
        this.itemGateway = this.moduleRef.get(ItemGateway);
        this.gameLogicGateway = this.moduleRef.get(GameLogicGateway);
    }

    setNextPosition(player: Player, data: CombatAction, room: RoomData) {
        const nextPosition =
            player.position === player.startingPoint
                ? player.startingPoint
                : this.combatService.findNextPlayerPosition(player.startingPoint, data.roomId);
        if (player.type) {
            const availablePositions = findAvailableTerrainForItem(player.position, room.map.board);
            this.itemGateway.handleDroppedItems({
                roomId: data.roomId,
                inventory: player.inventory,
                positions: availablePositions,
            });
        }
        return nextPosition;
    }
    async handleCombat(player: Player, data: CombatAction, nextPosition: Position, room: RoomData, result: AttackResult) {
        if (player.type) {
            for (const item of player.inventory) {
                if (item.id.includes(ItemTypes.Flag)) {
                    this.gameModeService.flagDropped(data.roomId);
                    this.gameLogicGateway.server.to(data.roomId).emit(CTFEvents.FlagDropped);
                }
            }
        }
        const playerIndex = room.players.findIndex((playerToFind) => playerToFind.id === player.id);
        if (playerIndex !== -1) {
            room.players[playerIndex].position = nextPosition;
            room.players[playerIndex].inventory = [];
        }
        if (room.currentTurn && room.currentTurn.type) {
            await this.movementService.delay(MOVEMENT_DELAY);
            this.gameLogicGateway.server.to(data.roomId).emit(ActiveGameEvents.MapRequest);
            if (result.gameState.players[0].type && room.currentTurn.id === result.gameState.players[0].id) {
                const virtualPlayerIndex = room.players.findIndex((playerToFind) => playerToFind.id === result.gameState.players[0].id);
                this.virtualPlayerService.afterCombatTurn(room.players[virtualPlayerIndex], data.roomId);
            } else {
                this.gameLogicGateway.handleEndTurn({ roomId: data.roomId });
            }
        }
    }
    turnAction(roomId: string, currentPlayer: Player) {
        this.virtualPlayerService.turnAction(roomId, currentPlayer);
    }
    async moveAction(moveAction: MoveAction) {
        const tile = moveAction.data.grid.board[moveAction.nextPosition.x][moveAction.nextPosition.y];
        const prevPosition = moveAction.index > 0 ? moveAction.data.path.positions[moveAction.index - 1] : moveAction.movingPlayer.position;
        moveAction.movingPlayer.position = prevPosition;

        if (moveAction.nextPosition.x > prevPosition.x) moveAction.movingPlayer.lastDirection = Directions.Right;
        else if (moveAction.nextPosition.x < prevPosition.x) moveAction.movingPlayer.lastDirection = Directions.Left;

        await this.movementService.delay(MOVEMENT_DELAY);

        this.moveLogic(moveAction);

        if (tile.item.name && !tile.item.name.includes(ItemTypes.StartingPoint)) {
            if (
                this.handleItemPickup({
                    tile,
                    playerInRoom: moveAction.playerInRoom,
                    movingPlayer: moveAction.movingPlayer,
                    roomId: moveAction.data.roomId,
                })
            ) {
                return true;
            }
        }
        return this.checkWinningTeam(moveAction.data.roomId, moveAction.movingPlayer);
    }

    private checkWinningTeam(roomId: string, player: Player) {
        const winningTeam = this.gameModeService.checkFlagCaptured(roomId, player);
        if (winningTeam) {
            this.gameLogicGateway.server.to(roomId).emit(CTFEvents.FlagCaptured, { winningTeam });
            return true;
        }
    }
    private handleItemPickup(itemPickup: ItemPickup) {
        const item = createItem(itemPickup.tile.item.name as ItemId, itemPickup.tile.item.description);
        if (!itemPickup.playerInRoom.inventory) {
            itemPickup.playerInRoom.inventory = [];
        }
        itemPickup.playerInRoom.inventory.push(item);
        this.gameLogicGateway.server.to(itemPickup.roomId).emit(ActiveGameEvents.ItemPickedUp, {
            item,
            itemPosition: itemPickup.movingPlayer.position,
            playerId: itemPickup.movingPlayer.id,
        });
        this.gameLogicGateway.server.to(itemPickup.roomId).emit(ActiveGameEvents.PlayerNextPosition, {
            player: itemPickup.movingPlayer,
            nextPosition: itemPickup.movingPlayer.position,
        });
        itemPickup.playerInRoom.playerStats.nItemsCollected++;
        return true;
    }
    private moveLogic(moveAction: MoveAction) {
        if (!moveAction.room || !moveAction.playerInRoom) {
            this.gameLogicGateway.server.to(moveAction.data.roomId).emit(ActiveGameEvents.PlayerDisconnect, { playerId: moveAction.movingPlayer.id });
            return true;
        }

        this.gameLogicGateway.server.to(moveAction.data.roomId).emit(ActiveGameEvents.PlayerNextPosition, {
            player: moveAction.movingPlayer,
            nextPosition: moveAction.nextPosition,
        });

        this.gameModeService.setTilesVisited(moveAction.room, moveAction.playerInRoom, moveAction.nextPosition);

        moveAction.movingPlayer.position = moveAction.nextPosition;

        if (!moveAction.data.isRightClick) {
            this.movementService.decreaseSpeed(moveAction.movingPlayer, moveAction.data.grid, moveAction.nextPosition);
        }
    }
}
