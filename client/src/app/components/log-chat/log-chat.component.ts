import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { GameChatComponent } from '@app/components/game-chat/game-chat.component';
import { LogService } from '@app/services/logs/log.service';
import { DOM_DELAY } from '@common/constants';
import { Log } from '@common/interfaces';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-log-chat',
    imports: [GameChatComponent],
    templateUrl: './log-chat.component.html',
    styleUrl: './log-chat.component.scss',
    standalone: true,
})
export class LogChatComponent implements OnInit, OnDestroy {
    @ViewChild('logsContainer') private logsContainer!: ElementRef;
    areLogsChosen: boolean = false;
    areLogsFiltered: boolean = false;
    scrollDown: boolean = true;

    logs: Log[] = [];

    private logSubscription = new Subscription();

    constructor(private logService: LogService) {}

    ngOnInit(): void {
        this.logService.setupListeners();
        this.setupLogListener();
    }

    ngOnDestroy() {
        this.logs = [];
        this.logService.ngOnDestroy();
        this.logSubscription.unsubscribe();
    }

    seeChat() {
        this.areLogsChosen = false;
    }

    seeLogs() {
        this.areLogsChosen = true;
    }

    filterLogs() {
        this.logService.filterLogs();
        this.areLogsFiltered = !this.areLogsFiltered;
    }

    scrollToBottom() {
        if (this.scrollDown) {
            if (this.logsContainer) {
                setTimeout(() => {
                    const container = this.logsContainer.nativeElement;
                    container.scrollTop = container.scrollHeight;
                }, DOM_DELAY);
            }
        }
    }

    private setupLogListener() {
        this.logSubscription = this.logService.logs.subscribe((logs) => {
            this.logs = logs;
            this.scrollToBottom();
        });
    }
}
