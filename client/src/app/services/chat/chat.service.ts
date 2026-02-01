import { Injectable, OnDestroy } from '@angular/core';
import { ChatEvents } from '@common/gateway-events';
import { Message, MessagePayload } from '@common/interfaces';
import { BehaviorSubject, Observable } from 'rxjs';
import { PlayerService } from '@app/services/player/player.service';
import { SocketService } from '@app/services/socket/socket.service';
import { newDate } from '@common/shared-utils';

@Injectable({
    providedIn: 'root',
})
export class ChatService implements OnDestroy {
    private _messages = new BehaviorSubject<Message[]>([]);

    constructor(
        private socketService: SocketService,
        private playerService: PlayerService,
    ) {
        this.setupListeners();
    }

    get messages(): Observable<Message[]> {
        return this._messages.asObservable();
    }

    isMyMessage(message: Message) {
        return this.playerService.player.id === message.player.id;
    }

    getMessages() {
        this.socketService.sendMessage(ChatEvents.RetrieveMessages, this.playerService.roomId);
    }

    sendMessage(text: string) {
        const payload: MessagePayload = {
            message: {
                message: text,
                time: newDate(),
                player: this.playerService.player,
            },
            roomId: this.playerService.roomId,
        };
        this.socketService.sendMessage(ChatEvents.SendMessage, payload);
    }

    ngOnDestroy(): void {
        this.socketService.off(ChatEvents.GiveMessages);
        this.socketService.off(ChatEvents.SendMessage);
        this.socketService.off(ChatEvents.RetrieveMessages);
        this.socketService.off(ChatEvents.ReceiveMessage);
    }

    private setupListeners() {
        this.socketService.on<Message[]>(ChatEvents.GiveMessages, (data) => {
            this._messages.next(data);
        });

        this.socketService.on<MessagePayload>(ChatEvents.ReceiveMessage, (data) => {
            this._messages.next([...this._messages.value, data.message]);
        });
    }
}
