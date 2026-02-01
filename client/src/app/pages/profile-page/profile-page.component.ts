import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@app/services/auth-service/auth-service.service';
import { Routes } from '@app/enums/routes-enums';
import { AsyncPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-profile-page',
    imports: [AsyncPipe, FormsModule, DatePipe],
    templateUrl: './profile-page.component.html',
    styleUrl: './profile-page.component.scss',
})
export class ProfilePageComponent {
    userProfile$ = this.authService.userProfile$;
    confirmUsername = '';
    showDeleteConfirm = false;
    isEditingAvatar = false;
    selectedAvatar = '';

    avatars: string[] = [
        'assets/account_avatar/avatar-1.png',
        'assets/account_avatar/avatar-2.png',
        'assets/account_avatar/avatar-3.png',
        'assets/account_avatar/avatar-4.png',
        'assets/account_avatar/avatar-5.png',
        'assets/account_avatar/avatar-6.png',
        'assets/account_avatar/avatar-7.png',
        'assets/account_avatar/avatar-8.png',
        'assets/account_avatar/avatar-9.png',
    ];

    constructor(
        private authService: AuthService,
        private router: Router,
    ) {}

    toggleDeleteConfirm() {
        this.showDeleteConfirm = !this.showDeleteConfirm;
        this.confirmUsername = '';
    }

    toggleEditAvatar(currentAvatar: string) {
        this.isEditingAvatar = !this.isEditingAvatar;
        this.selectedAvatar = currentAvatar;
    }

    getAvatarPath(avatarName: string): string {
        if (avatarName.includes('/')) {
            return avatarName;
        }
        return `assets/account_avatar/${avatarName}.png`;
    }

    saveAvatar() {
        const avatarName = this.selectedAvatar.split('/').pop()?.replace('.png', '') || 'avatar-1';
        this.authService.updateAccountMongoDB({ avatar: avatarName }).subscribe({
            next: (updatedProfile) => {
                this.authService.refreshUserProfile(updatedProfile);
                this.isEditingAvatar = false;
            },
        });
    }

    getWinRate(wins: number, losses: number): string {
        const total = wins + losses;
        if (total === 0) return '0';
        const percentage = 100;
        return ((wins / total) * percentage).toFixed(1);
    }

    async deleteAccount(username: string) {
        if (this.confirmUsername === username) {
            this.authService.deleteAccount().subscribe({
                next: async () => {
                    await this.authService.handleLogout();
                    this.router.navigate([Routes.Login]);
                },
            });
        }
    }
}
