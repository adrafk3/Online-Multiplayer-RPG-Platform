import { Component, ElementRef, ViewChild, AfterViewChecked, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { GlobalChatService } from '@app/services/global-chat/global-chat.service';
import { AuthService } from '@app/services/auth-service/auth-service.service';
import { Observable, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { GlobalChatMessage } from '@common/types';
import { Routes } from '@app/enums/routes-enums';

@Component({
    selector: 'app-global-chat-menu',
    imports: [CommonModule, FormsModule],
    templateUrl: './global-chat-menu.component.html',
    styleUrl: './global-chat-menu.component.scss',
    animations: [
        trigger('messageAnimation', [
            transition(':enter', [
                style({ opacity: 0, transform: 'translateY(10px)' }),
                animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
            ]),
            transition(':leave', [animate('300ms ease-in', style({ opacity: 0, transform: 'translateY(-20px)', height: 0, marginBottom: 0 }))]),
        ]),
    ],
})
export class GlobalChatMenuComponent implements AfterViewChecked, OnInit, OnDestroy {
    @ViewChild('messagesContainer') private messagesContainer?: ElementRef;

    isOpen = false;
    isVisible = true;
    messageText = '';
    messages$: Observable<GlobalChatMessage[]>;
    private shouldScroll = false;
    private routerSubscription?: Subscription;
    private excludedRoutes: string[] = [Routes.Login];

    constructor(
        private globalChatService: GlobalChatService,
        private router: Router,
        private authService: AuthService,
    ) {
        this.messages$ = this.globalChatService.messages$;
    }

    get currentUsername(): string | undefined {
        return this.authService.currentUserProfile?.username;
    }

    ngOnInit(): void {
        this.updateVisibility();
        this.routerSubscription = this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
            this.updateVisibility();
            if (!this.isVisible) {
                this.isOpen = false;
            }
        });
    }

    ngAfterViewChecked(): void {
        if (this.shouldScroll) {
            this.scrollToBottom();
            this.shouldScroll = false;
        }
    }

    ngOnDestroy(): void {
        this.routerSubscription?.unsubscribe();
    }

    toggleChat(): void {
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.shouldScroll = true;
        }
    }

    sendMessage(): void {
        if (this.canSend()) {
            this.globalChatService.sendMessage(this.messageText);
            this.messageText = '';
            this.shouldScroll = true;
        }
    }

    canSend(): boolean {
        return this.messageText.trim().length > 0;
    }

    formatTime(timestamp: string): string {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('fr-CA', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        });
    }

    private updateVisibility(): void {
        this.isVisible = !this.excludedRoutes.includes(this.router.url);
    }

    private scrollToBottom(): void {
        if (this.messagesContainer) {
            const element = this.messagesContainer.nativeElement;
            element.scrollTop = element.scrollHeight;
        }
    }
}
