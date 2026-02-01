import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { HeaderComponent } from '@app/components/header/header.component';
import { GlobalChatMenuComponent } from '@app/components/global-chat-menu/global-chat-menu.component';
import { SocketService } from '@app/services/socket/socket.service';
import { AuthService } from '@app/services/auth-service/auth-service.service';
import { filter } from 'rxjs/operators';
import { Routes } from '@app/enums/routes-enums';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    imports: [RouterOutlet, HeaderComponent, GlobalChatMenuComponent],
    standalone: true,
})
export class AppComponent implements OnInit {
    showHeader = true;
    private excludedRoutes: string[] = [Routes.Home, Routes.Game, Routes.Login];
    private themeAudio: HTMLAudioElement;
    private audioInitialized = false;

    constructor(
        private router: Router,
        private socketService: SocketService,
        private authService: AuthService,
    ) {
        this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
            this.showHeader = !this.excludedRoutes.includes(this.router.url);
        });
    }

    get isMuted() {
        return this.themeAudio.muted;
    }

    ngOnInit() {
        this.socketService.connect();
        this.initializeAudio();
        this.setupLogoutOnUnload();
    }

    toggleMute() {
        this.themeAudio.muted = !this.themeAudio.muted;

        if (!this.audioInitialized) {
            this.initializeAudio();
        }

        if (!this.isMuted) {
            this.themeAudio.muted = false;
            this.themeAudio.play().catch();
        } else {
            this.themeAudio.muted = true;
        }
    }

    private setupLogoutOnUnload() {
        window.addEventListener('beforeunload', () => {
            this.authService.handleLogout();
        });
    }

    private initializeAudio() {
        if (this.audioInitialized) return;

        this.audioInitialized = true;
        this.themeAudio = new Audio('/assets/audio/main-theme.mp3');
        this.themeAudio.loop = true;
        this.themeAudio.muted = true;
        this.themeAudio.load();
    }
}
