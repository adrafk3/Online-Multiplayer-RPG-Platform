import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Player } from '@common/interfaces';
import { AVATARS } from '@common/avatar';
import { DebugService } from '@app/services/debug-service/debug-service.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PopUpData } from '@app/interfaces/popUp.interface';
import { ItemId } from '@common/enums';

@Component({
    selector: 'app-right-click-popup',
    templateUrl: './right-click-popup.component.html',
    styleUrls: ['./right-click-popup.component.scss'],
    standalone: true,
})
export class RightClickPopupComponent implements OnInit {
    playerImage: string | undefined = undefined;
    displayText: string | undefined = undefined;

    constructor(
        private dialogRef: MatDialogRef<RightClickPopupComponent>,
        private debugService: DebugService,
        @Inject(MAT_DIALOG_DATA) public data: PopUpData,
    ) {
        this.debugService.isDebug.pipe(takeUntilDestroyed()).subscribe((isDebug) => {
            if (isDebug) {
                this.onClose();
            }
        });
    }

    ngOnInit(): void {
        const itemName = this.data.item?.name;
        const tileInfo = this.data.tileInfo ? `${this.data.tileInfo}\n` : '';
        const itemDescription =
            this.data.item?.description && itemName !== ItemId.ItemFlag && itemName !== ItemId.ItemStartingPoint
                ? `Item:\n ${this.data.item.description}\n`
                : '';

        if (this.isPlayerData(this.data)) {
            const player = this.data.player as Player;
            this.playerImage = this.getPlayerImage(player);
            const playerName = `Joueur:\n ${player.name}\n`;
            this.displayText = playerName + tileInfo + itemDescription;
        } else {
            this.displayText = tileInfo + itemDescription;
        }
    }

    isPlayerData(data: PopUpData) {
        return data.player?.avatar !== undefined;
    }

    getPlayerImage(player: Player): string {
        return player.avatar ? AVATARS.find((avatar) => avatar.name === player.avatar)?.icon ?? AVATARS[0].icon : AVATARS[0].icon;
    }

    onClose(): void {
        this.dialogRef.close();
    }

    onBackdropClick(): void {
        this.dialogRef.close();
    }
}
