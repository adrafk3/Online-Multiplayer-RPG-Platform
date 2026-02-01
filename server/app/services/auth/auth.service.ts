import { Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as admin from 'firebase-admin';
import { User, UserDocument } from '@app/model/database/user';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService implements OnModuleInit {
    private firebaseApp: admin.app.App;
    private readonly duplicateKeyErrorCode = 11000;

    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private configService: ConfigService,
    ) {}

    onModuleInit() {
        const serviceAccountBase64: string = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT');
        const serviceAccount: admin.ServiceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf8'));

        this.firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    }

    async verifyToken(token: string): Promise<admin.auth.DecodedIdToken> {
        return admin.auth(this.firebaseApp).verifyIdToken(token);
    }

    async checkUsernameAvailability(username: string): Promise<boolean> {
        const existingUser = await this.userModel.findOne({ username }).exec();
        return !existingUser;
    }

    async createUser(firebaseUid: string, email: string, username: string, avatar: string): Promise<{ user: UserDocument; sessionToken: string }> {
        const isAvailable = await this.checkUsernameAvailability(username);
        if (!isAvailable) {
            throw new UnauthorizedException("Ce nom d'utilisateur est déjà utilisé");
        }

        const sessionToken = this.generateSessionToken();
        const user = await this.userModel.create({
            firebaseUid,
            email,
            username,
            avatar,
            trophies: 0,
            classicWins: 0,
            classicLosses: 0,
            ctfWins: 0,
            ctfLosses: 0,
            createdAt: new Date(),
            lastLoginAt: new Date(),
            sessionToken,
        });
        return { user, sessionToken };
    }

    async login(firebaseUid: string): Promise<{ user: UserDocument; sessionToken: string } | null> {
        const user = await this.userModel.findOne({ firebaseUid }).exec();
        if (!user) return null;

        if (user.sessionToken) {
            throw new UnauthorizedException('Ce compte est déjà connecté sur un autre appareil');
        }

        const sessionToken = this.generateSessionToken();
        user.sessionToken = sessionToken;
        user.lastLoginAt = new Date();
        await user.save();

        return { user, sessionToken };
    }

    async logout(firebaseUid: string): Promise<void> {
        await this.userModel.findOneAndUpdate({ firebaseUid }, { sessionToken: null }).exec();
    }

    async validateSession(firebaseUid: string, sessionToken: string): Promise<boolean> {
        const user = await this.userModel.findOne({ firebaseUid }).exec();
        return user?.sessionToken === sessionToken;
    }

    async findByFirebaseUid(firebaseUid: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ firebaseUid }).exec();
    }

    async updateProfile(firebaseUid: string, updates: Partial<User>): Promise<UserDocument | null> {
        return this.userModel.findOneAndUpdate({ firebaseUid }, updates, { new: true }).exec();
    }

    async deleteUser(firebaseUid: string): Promise<void> {
        await this.userModel.findOneAndDelete({ firebaseUid }).exec();
    }

    private generateSessionToken(): string {
        const tokenLength = 32;
        return randomBytes(tokenLength).toString('hex');
    }
}
