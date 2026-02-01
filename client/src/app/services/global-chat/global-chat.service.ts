import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { SocketService } from '@app/services/socket/socket.service';
import { AuthService } from '@app/services/auth-service/auth-service.service';
import { GlobalChatEvents } from '@common/gateway-events';
import { GlobalChatMessage } from '@common/types';

@Injectable({
    providedIn: 'root',
})
export class GlobalChatService implements OnDestroy {
    messages$: Observable<GlobalChatMessage[]>;
    private messagesSubject = new BehaviorSubject<GlobalChatMessage[]>([]);
    private connectionSubscription?: Subscription;
    private readonly maxMessages = 100;

    constructor(
        private socketService: SocketService,
        private authService: AuthService,
    ) {
        this.messages$ = this.messagesSubject.asObservable();
        this.setupListeners();
        this.waitForConnectionAndRetrieve();
    }

    sendMessage(content: string): void {
        const username = this.authService.currentUserProfile?.username;
        if (!username || !content.trim()) return;

        const message: GlobalChatMessage = {
            username,
            content: content.trim(),
            timestamp: new Date().toISOString(),
        };

        this.socketService.sendMessage(GlobalChatEvents.SendGlobalMessage, message);
    }

    ngOnDestroy(): void {
        this.socketService.off(GlobalChatEvents.ReceiveGlobalMessage);
        this.socketService.off(GlobalChatEvents.GiveGlobalMessages);
        this.connectionSubscription?.unsubscribe();
    }

    private setupListeners(): void {
        this.socketService.on<GlobalChatMessage>(GlobalChatEvents.ReceiveGlobalMessage, (message) => {
            const currentMessages = this.messagesSubject.value;
            const updatedMessages = [...currentMessages, message];

            if (updatedMessages.length > this.maxMessages) {
                updatedMessages.shift();
            }

            this.messagesSubject.next(updatedMessages);
        });

        this.socketService.on<GlobalChatMessage[]>(GlobalChatEvents.GiveGlobalMessages, (messages) => {
            this.messagesSubject.next(messages);
        });
    }

    private waitForConnectionAndRetrieve(): void {
        this.connectionSubscription = this.socketService
            .isConnected()
            .pipe(
                filter((connected) => connected),
                take(1),
            )
            .subscribe(() => {
                this.retrieveMessages();
            });
    }

    private retrieveMessages(): void {
        this.socketService.sendMessage(GlobalChatEvents.RetrieveGlobalMessages, {});
    }
}
