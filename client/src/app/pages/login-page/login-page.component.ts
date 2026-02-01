import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@app/services/auth-service/auth-service.service';

@Component({
    selector: 'app-login-page',
    imports: [FormsModule],
    templateUrl: './login-page.component.html',
    styleUrl: './login-page.component.scss',
    standalone: true,
})
export class LoginPageComponent {
    protected avatars: string[] = [
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
    protected username: string = '';
    protected email: string = '';
    protected password: string = '';
    protected loading: boolean = false;
    protected isRegistering: boolean = false;
    protected selectedAvatar: string = this.avatars[0];
    protected errorMessage: string = '';

    constructor(
        private authService: AuthService,
        private router: Router,
    ) {}

    protected setIsRegistering(isRegistering: boolean): void {
        this.isRegistering = isRegistering;
        this.errorMessage = '';
    }

    protected async handleLoginButton(): Promise<void> {
        this.loading = true;
        this.errorMessage = '';

        const avatarName = this.selectedAvatar.split('/').pop()?.replace('.png', '') || 'avatar-1';

        const result = this.isRegistering
            ? await this.authService.register(this.username, this.password, this.email, avatarName)
            : await this.authService.handleLogin(this.email, this.password);

        this.loading = false;

        if (result.error) {
            this.errorMessage = result.error;
        } else if (result.user) {
            this.router.navigate(['/home']);
        }
    }

    protected setSelectedAvatar(avatar: string): void {
        this.selectedAvatar = avatar;
    }
}
