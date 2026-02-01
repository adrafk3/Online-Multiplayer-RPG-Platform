import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { GameChatComponent } from './game-chat.component';
import { ChatService } from '@app/services/chat/chat.service';
import { FormsModule } from '@angular/forms';
import { Message } from '@common/interfaces';
import { of } from 'rxjs';
import { DOM_DELAY } from '@common/constants';
import { MOCK_PLAYERS } from '@common/constants.spec';

describe('GameChatComponent', () => {
    let component: GameChatComponent;
    let fixture: ComponentFixture<GameChatComponent>;
    let mockChatService: jasmine.SpyObj<ChatService>;
    let mockMessages: Message[];

    beforeEach(async () => {
        mockMessages = [
            { message: 'Test 1', time: '11:06:05', player: MOCK_PLAYERS[0] },
            { message: 'Test 2', time: '11:07:10', player: MOCK_PLAYERS[1] },
        ];

        mockChatService = jasmine.createSpyObj('ChatService', ['ngOnInit', 'getMessages', 'ngOnDestroy', 'sendMessage', 'isMyMessage'], {
            messages: of(mockMessages),
        });

        await TestBed.configureTestingModule({
            imports: [FormsModule, GameChatComponent],
            providers: [{ provide: ChatService, useValue: mockChatService }],
        }).compileComponents();

        fixture = TestBed.createComponent(GameChatComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        fixture.destroy();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('message handling', () => {
        it('should identify my messages', () => {
            const testMessage: Message = {
                message: 'Test',
                time: '11:06:05',
                player: MOCK_PLAYERS[0],
            };
            mockChatService.isMyMessage.and.returnValue(true);

            expect(component.isMyMessage(testMessage)).toBeTrue();
            expect(mockChatService.isMyMessage).toHaveBeenCalledWith(testMessage);
        });

        it('should send messages', () => {
            const testMessage = 'Hello world';
            component.messageText = testMessage;
            component.sendMessage(testMessage);

            expect(mockChatService.sendMessage).toHaveBeenCalledWith(testMessage);
            expect(component.messageText).toBe('');
        });

        it('should not send empty messages', () => {
            component.sendMessage('');
            expect(mockChatService.sendMessage).not.toHaveBeenCalled();
        });
    });

    describe('scrolling behavior', () => {
        it('should scroll to bottom after initialization', fakeAsync(() => {
            const scrollSpy = spyOn(component, 'scrollToBottom');
            component.ngOnInit();
            tick(DOM_DELAY);
            expect(scrollSpy).toHaveBeenCalled();
        }));

        it('should scroll to bottom after sending message', fakeAsync(() => {
            const scrollSpy = spyOn(component, 'scrollToBottom');
            component.sendMessage('Test');
            tick(DOM_DELAY);
            expect(scrollSpy).toHaveBeenCalled();
        }));

        it('should scroll container to bottom', fakeAsync(() => {
            const mockElement = {
                nativeElement: {
                    scrollHeight: 500,
                    scrollTop: 0,
                },
            };
            component['messagesContainer'] = mockElement;

            component.scrollToBottom();
            tick(DOM_DELAY);
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            expect(mockElement.nativeElement.scrollTop).toBe(500);
        }));
    });

    describe('template integration', () => {
        it('should display messages in the template', () => {
            fixture.detectChanges();
            const messageElements = fixture.nativeElement.querySelectorAll('.message');
            expect(messageElements.length).toBe(mockMessages.length);
        });

        it('should bind message input to component', () => {
            const input = fixture.nativeElement.querySelector('input');
            input.value = 'Test message';
            input.dispatchEvent(new Event('input'));
            fixture.detectChanges();

            expect(component.messageText).toBe('Test message');
        });

        it('should call sendMessage on form submit', () => {
            const sendSpy = spyOn(component, 'sendMessage');
            const form = fixture.nativeElement.querySelector('#send');
            component.messageText = 'Test';
            fixture.detectChanges();

            form.dispatchEvent(new Event('click'));
            expect(sendSpy).toHaveBeenCalledWith('Test');
        });
    });
});
