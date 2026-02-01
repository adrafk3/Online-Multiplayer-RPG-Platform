import { currentUser } from '@app/decorators/current-user.decorator';
import { AuthGuard } from '@app/guards/auth.guard';
import { UserDocument } from '@app/model/database/user';
import { AuthService } from '@app/services/auth/auth.service';
import { Body, Controller, Delete, Get, Post, Put, UseGuards } from '@nestjs/common';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    @Post('check-username')
    async checkUsername(@Body() body: { username: string }) {
        const isAvailable = await this.authService.checkUsernameAvailability(body.username);
        return { available: isAvailable };
    }

    @Post()
    async createUser(@Body() body: { uid: string; email: string; username: string; avatar: string }) {
        return this.authService.createUser(body.uid, body.email, body.username, body.avatar);
    }

    @Post('login')
    async login(@Body() body: { uid: string }) {
        return this.authService.login(body.uid);
    }

    @Post('logout')
    @UseGuards(AuthGuard)
    async logout(@currentUser() user: UserDocument) {
        return this.authService.logout(user.firebaseUid);
    }

    @Get()
    @UseGuards(AuthGuard)
    async getCurrentUser(@currentUser() user: UserDocument) {
        return user;
    }

    @Put()
    @UseGuards(AuthGuard)
    async updateCurrentUser(@currentUser() user: UserDocument, @Body() updates: { username?: string; avatar?: string }) {
        return this.authService.updateProfile(user.firebaseUid, updates);
    }

    @Delete()
    @UseGuards(AuthGuard)
    async deleteCurrentUser(@currentUser() user: UserDocument) {
        return this.authService.deleteUser(user.firebaseUid);
    }
}
