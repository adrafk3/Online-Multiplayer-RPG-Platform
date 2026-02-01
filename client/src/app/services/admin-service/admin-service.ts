import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Game } from '@common/types';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { FORMAT_CHARACTERS, HOUR_CHANGE } from '@common/constants';
import { AdminRoutes } from '@app/enums/admin-routes';

@Injectable({
    providedIn: 'root',
})
export class AdminService {
    private readonly apiUrl = environment.serverUrl + AdminRoutes.Game;

    constructor(private http: HttpClient) {}

    getAllGames(): Observable<Game[]> {
        return this.http.get<Game[]>(this.apiUrl);
    }

    getGameById(id: string): Observable<Game> {
        return this.http.get<Game>(`${this.apiUrl}${id}`);
    }

    updateVisibility(id: string): Observable<void> {
        return this.http.patch<void>(`${this.apiUrl}${AdminRoutes.IsHidden}${id}`, {});
    }

    deleteGame(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}${id}`);
    }
    fixHour(date?: string): string {
        if (!date) return 'N/A';
        const dateObj = new Date(date);
        dateObj.setHours(dateObj.getHours() - HOUR_CHANGE);
        return dateObj.toISOString().replace('T', ' ').slice(0, FORMAT_CHARACTERS);
    }
}
