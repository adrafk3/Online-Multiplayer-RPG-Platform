import { Component, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@app/services/auth-service/auth-service.service';
import { Routes } from '@app/enums/routes-enums';
import { AsyncPipe } from '@angular/common';

@Component({
    selector: 'app-profile-menu',
    imports: [AsyncPipe],
    templateUrl: './profile-menu.component.html',
    styleUrl: './profile-menu.component.scss',
})
export class ProfileMenuComponent {
    showMenu = false;
    currentUser$ = this.authService.currentUser$;
    userProfile$ = this.authService.userProfile$;

    constructor(
        private authService: AuthService,
        private router: Router,
    ) {}

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
        const target = event.target as HTMLElement;
        const clickedInside = target.closest('app-profile-menu');
        if (!clickedInside && this.showMenu) {
            this.showMenu = false;
        }
    }

    getAvatarPath(avatarName: string): string {
        if (avatarName.includes('/')) {
            return avatarName;
        }
        return `assets/account_avatar/${avatarName}.png`;
    }

    toggleMenu() {
        this.showMenu = !this.showMenu;
    }

    goToProfile() {
        this.showMenu = false;
        this.router.navigate(['/profile']);
    }

    async logout() {
        this.showMenu = false;
        await this.authService.handleLogout();
        this.router.navigate([Routes.Login]);
    }
}
