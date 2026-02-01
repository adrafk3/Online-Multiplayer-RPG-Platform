import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '@app/services/auth/auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private authService: AuthService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        const sessionToken = request.headers['x-session-token'];

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('No token provided');
        }

        if (!sessionToken) {
            throw new UnauthorizedException('No session token provided');
        }

        const token = authHeader.split('Bearer ')[1];

        try {
            const decodedToken = await this.authService.verifyToken(token);
            const user = await this.authService.findByFirebaseUid(decodedToken.uid);

            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            const isValidSession = await this.authService.validateSession(decodedToken.uid, sessionToken);
            if (!isValidSession) {
                throw new UnauthorizedException('Session invalide. Vous avez été déconnecté.');
            }

            request.user = user;
            return true;
        } catch (error) {
            throw new UnauthorizedException('Invalid token');
        }
    }
}
