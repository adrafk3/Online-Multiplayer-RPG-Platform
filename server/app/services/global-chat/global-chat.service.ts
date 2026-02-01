import { Injectable } from '@nestjs/common';
import { GlobalChatMessage } from '@common/types';

@Injectable()
export class GlobalChatService {
    private messages: GlobalChatMessage[] = [];
    private readonly maxMessages = 100;

    addMessage(message: GlobalChatMessage): void {
        this.messages.push(message);
        if (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }
    }

    getMessages(): GlobalChatMessage[] {
        return this.messages;
    }
}
