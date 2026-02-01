import { GameRoomService } from '@app/services/game-room/game-room.service';
import { MOCK_PLAYERS, MOCK_ROOM } from '@common/constants.spec';
import { Message } from '@common/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';

describe('ChatService', () => {
    let chatService: ChatService;
    let gameRoomService: GameRoomService;
    const player = MOCK_PLAYERS[0];
    const roomId = 'room1';

    beforeEach(async () => {
        MOCK_ROOM.messages = [];
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ChatService,
                {
                    provide: GameRoomService,
                    useValue: {
                        rooms: new Map(),
                    },
                },
            ],
        }).compile();

        chatService = module.get<ChatService>(ChatService);
        gameRoomService = module.get<GameRoomService>(GameRoomService);
    });

    it('should be defined', () => {
        expect(chatService).toBeDefined();
    });

    it('should add a message to the correct game room', () => {
        gameRoomService.rooms.set(roomId, MOCK_ROOM);
        const message: Message = { player, message: 'Hello', time: new Date().toISOString() };

        chatService.addMessage(message, roomId);

        expect(gameRoomService.rooms.get(roomId).messages).toContain(message);
    });

    it('should retrieve messages from the correct game room', () => {
        const messages: Message[] = [{ player, message: 'Hello', time: new Date().toISOString() }];
        gameRoomService.rooms.set(roomId, MOCK_ROOM);
        chatService.addMessage(messages[0], roomId);

        const retrievedMessages = chatService.getMessages(roomId);
        expect(retrievedMessages).toEqual(messages);
    });

    it("should return an empty array if the room doesn't have a messages attribute", () => {
        MOCK_ROOM.messages = undefined;
        gameRoomService.rooms.set(roomId, MOCK_ROOM);
        const result = chatService.getMessages(roomId);
        expect(result).toEqual([]);
    });
});
