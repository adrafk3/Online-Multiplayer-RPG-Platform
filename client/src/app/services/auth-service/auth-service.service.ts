import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { AccountType } from '@common/types';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, User, onAuthStateChanged } from 'firebase/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { firebaseAuth } from './firebase.config';

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    currentUser$: Observable<User | null>;
    userProfile$: Observable<AccountType | null>;

    private currentUserSubject = new BehaviorSubject<User | null>(null);
    private userProfileSubject = new BehaviorSubject<AccountType | null>(null);
    private readonly apiUrl = environment.serverUrl + '/auth';
    private http = inject(HttpClient);
    private sessionToken: string | null = null;

    constructor() {
        this.currentUser$ = this.currentUserSubject.asObservable();
        this.userProfile$ = this.userProfileSubject.asObservable();

        onAuthStateChanged(firebaseAuth, (user) => {
            this.currentUserSubject.next(user);
            if (user) {
                this.sessionToken = localStorage.getItem('sessionToken');
                this.loadUserProfile();
            } else {
                this.userProfileSubject.next(null);
                this.clearSession();
            }
        });
    }

    get currentUserProfile(): AccountType | null {
        return this.userProfileSubject.value;
    }

    async getToken(): Promise<string | null> {
        const user = firebaseAuth.currentUser;
        if (user) {
            return user.getIdToken();
        }
        return null;
    }

    getSessionToken(): string | null {
        return this.sessionToken;
    }

    async handleLogin(email: string, password: string): Promise<{ user?: User; error?: string }> {
        try {
            const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
            const loginResponse = await this.http
                .post<{ user: AccountType; sessionToken: string }>(`${this.apiUrl}/login`, { uid: credential.user.uid })
                .toPromise();

            if (loginResponse) {
                this.sessionToken = loginResponse.sessionToken;
                localStorage.setItem('sessionToken', loginResponse.sessionToken);
                this.userProfileSubject.next(loginResponse.user);
            }

            return { user: credential.user };
        } catch (error: unknown) {
            await firebaseAuth.signOut();

            const httpError = error as { error?: { message?: string } };
            if (httpError.error?.message) {
                return { error: httpError.error.message };
            }
            return { error: this.getFirebaseErrorMessage(error) };
        }
    }

    async register(username: string, password: string, email: string, avatar: string): Promise<{ user?: User; error?: string }> {
        try {
            const checkResponse = await this.http.post<{ available: boolean }>(`${this.apiUrl}/check-username`, { username }).toPromise();

            if (!checkResponse?.available) {
                return { error: "Ce nom d'utilisateur est déjà utilisé" };
            }

            const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
            const response = await this.http
                .post<{ user: AccountType; sessionToken: string }>(`${this.apiUrl}`, {
                    uid: credential.user.uid,
                    username,
                    email,
                    avatar,
                })
                .toPromise();

            if (response) {
                this.sessionToken = response.sessionToken;
                localStorage.setItem('sessionToken', response.sessionToken);
                this.userProfileSubject.next(response.user);
            }

            return { user: credential.user };
        } catch (error: unknown) {
            await firebaseAuth.signOut();

            const httpError = error as { error?: { message?: string } };
            if (httpError.error?.message) {
                return { error: httpError.error.message };
            }
            return { error: this.getFirebaseErrorMessage(error) };
        }
    }

    async handleLogout(): Promise<void> {
        if (this.sessionToken) {
            await this.http.post(`${this.apiUrl}/logout`, {}).toPromise();
        }
        this.clearSession();
        await firebaseAuth.signOut();
    }

    updateAccountMongoDB(updates: { username?: string; avatar?: string }): Observable<AccountType> {
        return this.http.put<AccountType>(`${this.apiUrl}`, updates);
    }

    deleteAccount(): Observable<unknown> {
        return this.http.delete(`${this.apiUrl}`);
    }

    refreshUserProfile(profile: AccountType) {
        this.userProfileSubject.next(profile);
    }

    private clearSession(): void {
        this.sessionToken = null;
        localStorage.removeItem('sessionToken');
    }

    private getFirebaseErrorMessage(error: unknown): string {
        const firebaseError = error as { code?: string };
        switch (firebaseError.code) {
            case 'auth/invalid-email':
                return 'Adresse email invalide';
            case 'auth/user-disabled':
                return 'Ce compte a été désactivé';
            case 'auth/user-not-found':
                return 'Aucun compte trouvé avec cet email';
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                return 'Email ou mot de passe incorrect';
            case 'auth/email-already-in-use':
                return 'Cet email est déjà utilisé';
            case 'auth/weak-password':
                return 'Le mot de passe doit contenir au moins 6 caractères';
            case 'auth/too-many-requests':
                return 'Trop de tentatives. Réessayez plus tard';
            case 'auth/network-request-failed':
                return 'Erreur de connexion. Vérifiez votre internet';
            default:
                return 'Une erreur est survenue. Réessayez';
        }
    }

    private loadUserProfile() {
        this.http.get<AccountType>(`${this.apiUrl}`).subscribe({
            next: (profile) => this.userProfileSubject.next(profile),
            error: () => this.userProfileSubject.next(null),
        });
    }
}
