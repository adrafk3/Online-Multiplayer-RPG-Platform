import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService } from '@app/services/chat/chat.service';
import { DOM_DELAY } from '@common/constants';
import { Message } from '@common/interfaces';
import { Subscription } from 'rxjs';
@Component({
    selector: 'app-game-chat',
    imports: [FormsModule],
    templateUrl: './game-chat.component.html',
    styleUrl: './game-chat.component.scss',
    standalone: true,
})
export class GameChatComponent implements OnInit {
    @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
    messages: Message[] = [];
    messageText: string = '';
    messagesSubscription = new Subscription();

    constructor(private chatService: ChatService) {}

    ngOnInit(): void {
        setTimeout(() => {
            this.chatService.getMessages();
            this.scrollToBottom();
        }, DOM_DELAY);
        this.messagesListener();
    }

    isMyMessage(message: Message) {
        return this.chatService.isMyMessage(message);
    }

    sendMessage(text: string) {
        if (text.length === 0) return;
        this.chatService.sendMessage(text);
        this.messageText = '';
        this.scrollToBottom();
    }

    scrollToBottom() {
        if (this.messagesContainer) {
            setTimeout(() => {
                const container = this.messagesContainer.nativeElement;
                container.scrollTop = container.scrollHeight;
            }, DOM_DELAY);
        }
    }
    private messagesListener() {
        this.messagesSubscription = this.chatService.messages.subscribe((messages) => {
            this.messages = messages;
            this.scrollToBottom();
        });
    }
}
