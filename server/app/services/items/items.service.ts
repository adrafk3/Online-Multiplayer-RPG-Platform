import { DAGGER_LIFE_APPLY } from '@app/constants/test-consts';
import { GameRoomService } from '@app/services/game-room/game-room.service';
import { ItemId } from '@common/enums';
import { Stats } from '@common/interfaces';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ItemService {
    constructor(private gameRoomService: GameRoomService) {}

    applyAttributesBuffs(roomId: string, playerId: string, stats: Stats) {
        const room = this.gameRoomService.rooms.get(roomId);
        const player = room.players.find((p) => p.id === playerId);
        if (!player.inventory) {
            player.inventory = [];
        }
        const potion = player.inventory.find((i) => i.id === ItemId.Item1);
        const shield = player.inventory.find((i) => i.id === ItemId.Item3);
        if (potion) {
            player.stats.life += 2;
            stats.defense -= 1;
        } else if (shield) {
            stats.defense += 2;
            stats.attack -= 1;
        }
        return stats;
    }

    applyPoison(roomId: string, playerId: string) {
        const room = this.gameRoomService.rooms.get(roomId);
        const player = room.players.find((p) => p.id === playerId);
        const poison = player.inventory?.find((i) => i.id === ItemId.Item4);
        return !!poison;
    }

    applyDagger(roomId: string, playerId: string) {
        const room = this.gameRoomService.rooms.get(roomId);
        const player = room.players.find((p) => p.id === playerId);
        const dagger = player.inventory?.find((i) => i.id === ItemId.Item2);
        if (dagger) {
            if (player.stats.life < DAGGER_LIFE_APPLY) {
                return true;
            }
        }
        return false;
    }

    applyDiceEffect(roomId: string, playerId: string, numDice: number) {
        const room = this.gameRoomService.rooms.get(roomId);
        const player = room.players.find((p) => p.id === playerId);
        const dice = player.inventory?.find((i) => i.id === ItemId.Item6);
        if (dice) {
            return Math.floor(Math.random() * 2) + (numDice - 1);
        }
        return null;
    }

    applyRevive(roomId: string, playerId: string) {
        const room = this.gameRoomService.rooms.get(roomId);
        const player = room.players.find((p) => p.id === playerId);
        const revive = player.inventory.find((i) => i.id === ItemId.Item5);
        return !!revive;
    }
}
