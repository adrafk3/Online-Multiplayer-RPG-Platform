import { TestBed } from '@angular/core/testing';
import { PlayerService } from '@app/services/player/player.service';
import { SocketService } from '@app/services/socket/socket.service';
import { MOCK_PLAYERS } from '@common/constants.spec';
import { ChatEvents } from '@common/gateway-events';
import { Message } from '@common/interfaces';
import { newDate } from '@common/shared-utils';
import { Observable } from 'rxjs';
import { ChatService } from './chat.service';

describe('ChatService', () => {
    let service: ChatService;
    let mockSocketService: jasmine.SpyObj<SocketService>;
    let mockPlayerService: jasmine.SpyObj<PlayerService>;

    const mockMessage: Message = {
        message: 'Test message',
        time: '11:04:05',
        player: MOCK_PLAYERS[0],
    };

    beforeEach(() => {
        mockSocketService = jasmine.createSpyObj('SocketService', ['sendMessage', 'on', 'off']);
        mockPlayerService = jasmine.createSpyObj('PlayerService', [], {
            player: MOCK_PLAYERS[0],
            roomId: 'room1',
        });

        TestBed.configureTestingModule({
            providers: [
                ChatService,
                { provide: SocketService, useValue: mockSocketService },
                { provide: PlayerService, useValue: mockPlayerService },
            ],
        });

        service = TestBed.inject(ChatService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('ngOnDestroy', () => {
        it('should remove all socket listeners', () => {
            service.ngOnDestroy();

            expect(mockSocketService.off).toHaveBeenCalledWith(ChatEvents.GiveMessages);
            expect(mockSocketService.off).toHaveBeenCalledWith(ChatEvents.SendMessage);
            expect(mockSocketService.off).toHaveBeenCalledWith(ChatEvents.RetrieveMessages);
            expect(mockSocketService.off).toHaveBeenCalledWith(ChatEvents.ReceiveMessage);
        });
    });

    describe('messages', () => {
        it('should return messages as observable', () => {
            const messages$ = service.messages;
            expect(messages$).toBeInstanceOf(Observable);
        });
    });

    describe('isMyMessage', () => {
        it('should return true if message belongs to current player', () => {
            const result = service.isMyMessage(mockMessage);
            expect(result).toBeTrue();
        });

        it('should return false if message does not belong to current player', () => {
            const otherMessage: Message = {
                ...mockMessage,
                player: MOCK_PLAYERS[1],
            };
            const result = service.isMyMessage(otherMessage);
            expect(result).toBeFalse();
        });
    });

    describe('getMessages', () => {
        it('should send RetrieveMessages event with roomId', () => {
            service.getMessages();
            expect(mockSocketService.sendMessage).toHaveBeenCalledWith(ChatEvents.RetrieveMessages, mockPlayerService.roomId);
        });
    });

    describe('sendMessage', () => {
        it('should send message with correct payload', () => {
            const testMessage = 'Hello world';
            service.sendMessage(testMessage);

            expect(mockSocketService.sendMessage).toHaveBeenCalledWith(
                ChatEvents.SendMessage,
                jasmine.objectContaining({
                    message: jasmine.objectContaining({
                        message: testMessage,
                        player: mockPlayerService.player,
                    }),
                    roomId: mockPlayerService.roomId,
                }),
            );
        });
    });

    describe('socket listeners', () => {
        it('should update messages when receiving GiveMessages', () => {
            const testMessages = [mockMessage];
            const giveMessagesCallback = mockSocketService.on.calls.argsFor(0)[1];
            giveMessagesCallback(testMessages);

            service.messages.subscribe((messages) => {
                expect(messages).toEqual(testMessages);
            });
        });

        it('should append message when receiving ReceiveMessage', () => {
            const initialMessages = [mockMessage];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (service as any)._messages.next(initialMessages);

            const newMessage: Message = {
                message: 'New message',
                time: newDate(),
                player: MOCK_PLAYERS[1],
            };

            const receiveMessageCallback = mockSocketService.on.calls.argsFor(1)[1];
            receiveMessageCallback({ message: newMessage, roomId: 'room1' });

            service.messages.subscribe((messages) => {
                expect(messages).toEqual([...initialMessages, newMessage]);
            });
        });
    });
});
