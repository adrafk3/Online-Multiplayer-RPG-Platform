import { GameRoomService } from '@app/services/game-room/game-room.service';
import { ITEM_DROP_DELAY } from '@common/constants';
import { ActiveGameEvents } from '@common/gateway-events';
import { ItemsDropped, ItemUpdate } from '@common/interfaces';
import { Injectable } from '@nestjs/common';
import { MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true })
@Injectable()
export class ItemGateway {
    @WebSocketServer()
    server: Server;
    private processedConnections = new Map<string, ItemsDropped>();

    constructor(private gameRoomService: GameRoomService) {}

    @SubscribeMessage(ActiveGameEvents.ItemSwapped)
    handleItemSwap(@MessageBody() data: ItemUpdate) {
        const room = this.gameRoomService.rooms.get(data.roomId);
        const player = room.players.find((playerToFind) => playerToFind.id === data.playerId);
        player.inventory = data.inventory;
        this.server.to(data.roomId).emit(ActiveGameEvents.ItemUpdate, { item: data.item, itemPosition: data.itemPosition, playerId: data.playerId });
    }

    @SubscribeMessage(ActiveGameEvents.ResetInventory)
    handleResetItems(@MessageBody() data: ItemUpdate) {
        const room = this.gameRoomService.rooms.get(data.roomId);
        const player = room.players.find((p) => p.id === data.playerId);
        player.inventory = [];
    }

    @SubscribeMessage(ActiveGameEvents.ItemsDropped)
    handleDroppedItems(@MessageBody() data: ItemsDropped) {
        const roomId = data.roomId;
        if (this.processedConnections.has(roomId)) {
            const storedData = this.processedConnections.get(roomId);
            this.server.to(roomId).emit(ActiveGameEvents.ItemsDropped, storedData);
            return;
        }

        this.processedConnections.set(roomId, data);
        this.server.to(roomId).emit(ActiveGameEvents.ItemsDropped, data);
        setTimeout(() => {
            this.processedConnections.delete(roomId);
        }, ITEM_DROP_DELAY);
    }
}
