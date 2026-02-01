import { GlobalChatService } from '@app/services/global-chat/global-chat.service';
import { GlobalChatEvents } from '@common/gateway-events';
import { GlobalChatMessage } from '@common/types';
import { Logger } from '@nestjs/common';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class GlobalChatGateway {
    @WebSocketServer() private server: Server;

    constructor(
        private globalChatService: GlobalChatService,
        private logger: Logger,
    ) {}

    @SubscribeMessage(GlobalChatEvents.SendGlobalMessage)
    handleSendMessage(@MessageBody() message: GlobalChatMessage): void {
        this.logger.log(`Received global message from ${message.username}: ${message.content}`);
        this.globalChatService.addMessage(message);
        this.server.emit(GlobalChatEvents.ReceiveGlobalMessage, message);
    }

    @SubscribeMessage(GlobalChatEvents.RetrieveGlobalMessages)
    handleRetrieveMessages(@ConnectedSocket() client: Socket): void {
        const messages = this.globalChatService.getMessages();
        client.emit(GlobalChatEvents.GiveGlobalMessages, messages);
    }
}
