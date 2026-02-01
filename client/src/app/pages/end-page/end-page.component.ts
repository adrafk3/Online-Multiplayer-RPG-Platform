import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GameChatComponent } from '@app/components/game-chat/game-chat.component';
import { PlayerService } from '@app/services/player/player.service';
import { MS_IN_SECOND, PADDED_SECONDS, SECONDS_IN_MINUTE } from '@common/constants';
import { GameStats, GlobalStats, Player, PlayerStats } from '@common/interfaces';
import { ChatService } from '@app/services/chat/chat.service';
import { Routes } from '@app/enums/routes-enums';

@Component({
    selector: 'app-end-page',
    templateUrl: './end-page.component.html',
    styleUrls: ['./end-page.component.scss'],
    imports: [CommonModule, GameChatComponent],
    providers: [ChatService],
    standalone: true,
})
export class EndPageComponent implements OnInit, OnDestroy {
    players: Player[] = [];
    globalStats: GlobalStats = this.getDefaultGlobalStats();
    formattedDuration = '0m 00s';
    sortedColumn: keyof PlayerStats | 'name' | null = null;
    isAscending: boolean = false;

    constructor(
        private router: Router,
        private playerService: PlayerService,
    ) {}

    ngOnInit() {
        const gameStats = localStorage.getItem('gameStats');
        if (gameStats) {
            this.updateStats(JSON.parse(gameStats));
        }
    }

    ngOnDestroy() {
        localStorage.removeItem('gameStats');
    }

    isCurrentUser(player: Player) {
        return player.id === this.playerService.player.id;
    }

    playNewGame() {
        this.playerService.quitGame();
        this.router.navigate([Routes.GameCreation]);
    }

    sortTable(column: keyof PlayerStats | 'name') {
        if (this.players.length === 0) return;

        if (this.sortedColumn === column) {
            this.isAscending = !this.isAscending;
        } else {
            this.sortedColumn = column;
            this.isAscending = true;
        }

        this.players.sort((a, b) => {
            if (column === 'name') {
                const nameA = a.name?.toLowerCase() || '';
                const nameB = b.name?.toLowerCase() || '';
                return this.isAscending ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
            }

            const valueA = Number(a.playerStats?.[column]) || 0;
            const valueB = Number(b.playerStats?.[column]) || 0;
            return !this.isAscending ? valueA - valueB : valueB - valueA;
        });
    }

    private updateStats(gameStats: GameStats) {
        this.players = gameStats.players;
        this.globalStats = gameStats.globalStats;
        this.formattedDuration = this.formatTime(this.globalStats.duration);
    }

    private formatTime(durationInMs: number): string {
        const totalSeconds = Math.floor(durationInMs / MS_IN_SECOND);
        const minutes = Math.floor(totalSeconds / SECONDS_IN_MINUTE);
        const seconds = totalSeconds % SECONDS_IN_MINUTE;
        const paddedSeconds = seconds < PADDED_SECONDS ? `0${seconds}` : seconds;
        return `${minutes}m ${paddedSeconds}s`;
    }

    private getDefaultGlobalStats(): GlobalStats {
        return {
            duration: 0,
            totalTurns: 0,
            doorsUsed: [],
            doorsUsedPercent: 0,
            tilesVisited: [],
            tilesVisitedPercentage: 0,
            flagHolders: [],
        };
    }
}
