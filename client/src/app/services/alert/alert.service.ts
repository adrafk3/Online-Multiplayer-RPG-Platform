import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { Router, NavigationStart } from '@angular/router';
import { filter } from 'rxjs/operators';
import { POPUP_HEIGHT, SNACKBAR_TIME } from '@common/constants';
import { RightClickPopupComponent } from '@app/components/right-click-popup/right-click-popup.component';
import { MatDialog } from '@angular/material/dialog';
import { TileTypes } from '@common/enums';
import { TILE_INFO } from '@app/constants/tile-info-const';
import { WinnerAnnouncementComponent } from '@app/components/winner-announcement-popup/winner-announcement-popup.component';
import { PopUpData } from '@app/interfaces/popUp.interface';

@Injectable({
    providedIn: 'root',
})
export class AlertService {
    constructor(
        private snackBar: MatSnackBar,
        private popUp: MatDialog,
        private router: Router,
    ) {
        this.router.events.pipe(filter((event) => event instanceof NavigationStart)).subscribe(() => {
            this.snackBar.dismiss();
        });
    }

    alert(message: string | unknown): void {
        const displayMessage = typeof message === 'string' ? message : JSON.stringify(message);

        this.snackBar.open(displayMessage, 'Fermer', {
            panelClass: ['error-snackbar'],
            verticalPosition: 'top',
        });
    }

    notify(message: string): MatSnackBarRef<TextOnlySnackBar> {
        return this.snackBar.open(message, 'Fermer', {
            panelClass: ['settings-tooltip'],
            verticalPosition: 'top',
            duration: SNACKBAR_TIME,
        });
    }
    announceWinner(message: string): void {
        this.popUp.closeAll();
        this.popUp.open(WinnerAnnouncementComponent, {
            data: { message },
            hasBackdrop: false,
            disableClose: false,
        });
    }
    tileInfo(message: PopUpData, event: MouseEvent) {
        if (Object.values(TileTypes).includes(message.tile as TileTypes)) {
            message.tileInfo = (TILE_INFO as Record<TileTypes, string>)[message.tile as TileTypes];
        }
        const screenHeight = window.innerHeight;
        let topPosition = event.clientY;
        const estimatedPopupHeight = POPUP_HEIGHT;
        if (topPosition + estimatedPopupHeight > screenHeight) {
            topPosition = screenHeight - estimatedPopupHeight;
        }
        this.popUp.closeAll();
        this.popUp.open(RightClickPopupComponent, {
            hasBackdrop: false,
            data: message,
            position: { top: `${topPosition}px`, left: `${event.clientX}px` },
        });
    }
}
