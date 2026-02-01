import { ChatService } from '@app/services/chat/chat.service';
import { ChatEvents } from '@common/gateway-events';
import { MessagePayload } from '@common/interfaces';
import { Injectable, Logger } from '@nestjs/common';
import { MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true })
@Injectable()
export class ChatGateWay {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly logger: Logger,
        private chatService: ChatService,
    ) {}

    @SubscribeMessage(ChatEvents.SendMessage)
    handleSendMessage(@MessageBody() data: MessagePayload) {
        this.logger.log(`Message sent by ${data.message.player.name}`);
        this.chatService.addMessage(data.message, data.roomId);
        this.server.to(data.roomId).emit(ChatEvents.ReceiveMessage, data);
    }

    @SubscribeMessage(ChatEvents.RetrieveMessages)
    handleGetMessages(@MessageBody() roomId: string) {
        this.logger.log(`Messages taken in ${roomId}`);
        const messages = this.chatService.getMessages(roomId) ?? [];
        this.server.to(roomId).emit(ChatEvents.GiveMessages, messages);
    }
}
