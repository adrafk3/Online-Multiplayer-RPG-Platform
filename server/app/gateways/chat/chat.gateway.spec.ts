import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateWay } from '@app/gateways/chat/chat.gateway';
import { ChatService } from '@app/services/chat/chat.service';
import { ChatEvents } from '@common/gateway-events';
import { MessagePayload } from '@common/interfaces';
import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { MOCK_PLAYERS } from '@common/constants.spec';

describe('ChatGateway', () => {
    let chatGateway: ChatGateWay;
    let chatService: ChatService;
    let server: Server;
    let logger: Partial<Logger>;
    const player = MOCK_PLAYERS[0];
    const roomId = 'room1';

    beforeEach(async () => {
        logger = { log: jest.fn() };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        chatService = { addMessage: jest.fn(), getMessages: jest.fn(() => []) } as any;

        const module: TestingModule = await Test.createTestingModule({
            providers: [ChatGateWay, { provide: ChatService, useValue: chatService }, { provide: Logger, useValue: logger }],
        }).compile();

        chatGateway = module.get<ChatGateWay>(ChatGateWay);
        server = { to: jest.fn().mockReturnThis(), emit: jest.fn() } as unknown as Server;
        chatGateway.server = server;
    });

    it('should be defined', () => {
        expect(chatGateway).toBeDefined();
    });

    it('should handle sending messages', () => {
        const messagePayload: MessagePayload = {
            message: { player, message: 'Hello', time: new Date().toISOString() },
            roomId: 'room1',
        };

        chatGateway.handleSendMessage(messagePayload);

        expect(logger.log).toHaveBeenCalledWith('Message sent by Player 1');
        expect(chatService.addMessage).toHaveBeenCalledWith(messagePayload.message, 'room1');
        expect(server.to).toHaveBeenCalledWith('room1');
        expect(server.to('room1').emit).toHaveBeenCalledWith(ChatEvents.ReceiveMessage, messagePayload);
    });

    it('should handle retrieving messages', () => {
        const messages = [{ player, message: 'Hello', date: new Date().toISOString() }];
        (chatService.getMessages as jest.Mock).mockReturnValue(messages);

        chatGateway.handleGetMessages(roomId);

        expect(logger.log).toHaveBeenCalledWith('Messages taken in room1');
        expect(chatService.getMessages).toHaveBeenCalledWith(roomId);
        expect(server.to).toHaveBeenCalledWith(roomId);
        expect(server.to(roomId).emit).toHaveBeenCalledWith(ChatEvents.GiveMessages, messages);
    });

    it("should set messages to an empty array if they don't exist in a room", async () => {
        jest.spyOn(chatService, 'getMessages').mockImplementation(undefined);
        chatGateway.handleGetMessages(roomId);
        expect(server.emit).toHaveBeenCalledWith(ChatEvents.GiveMessages, []);
    });
});
