import { GameRoomService } from '@app/services/game-room/game-room.service';
import { Message } from '@common/interfaces';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatService {
    constructor(private gameRoomService: GameRoomService) {}

    addMessage(message: Message, roomId: string) {
        const room = this.gameRoomService.rooms.get(roomId);
        if (room.messages) {
            this.gameRoomService.rooms.get(roomId).messages.push(message);
        }
    }

    getMessages(roomId: string): Message[] {
        const room = this.gameRoomService.rooms.get(roomId);
        if (room) {
            return room.messages ?? [];
        }
    }
}
