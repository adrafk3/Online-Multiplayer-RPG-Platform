import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActiveGridComponent } from '@app/components/active-grid/active-grid.component';
import { GameInfoComponent } from '@app/components/game-info/game-info.component';
import { InventoryPopUpComponent } from '@app/components/inventory-popup/inventory-popup.component';
import { LogChatComponent } from '@app/components/log-chat/log-chat.component';
import { PlayerListComponent } from '@app/components/player-list/player-list.component';
import { PlayerPanelComponent } from '@app/components/player-panel/player-panel.component';
import { TimerComponent } from '@app/components/timer/timer.component';
import { VsPopUpComponent } from '@app/components/vs-pop-up/vs-pop-up.component';
import { ActionService } from '@app/services/action/action.service';
import { ActiveGridService } from '@app/services/active-grid/active-grid.service';
import { ChatService } from '@app/services/chat/chat.service';
import { CombatService } from '@app/services/combat/combat.service';
import { DebugService } from '@app/services/debug-service/debug-service.service';
import { GameOverService } from '@app/services/game-over/game-over-service';
import { ItemService } from '@app/services/item/item.service';
import { PlayerMovementService } from '@app/services/player-mouvement/player-movement.service';
import { PlayerService } from '@app/services/player/player.service';
import { TimeService } from '@app/services/time/time.service';
import { TurnService } from '@app/services/turn/turn-service';
import { LogService } from '@app/services/logs/log.service';
import { POPUP_LENGTH } from '@common/constants';
import { Actions } from '@common/enums';
import { Player } from '@common/interfaces';
import { Position } from '@common/types';
import { combineLatest, Subscription } from 'rxjs';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
    selector: 'app-active-game-page',
    templateUrl: './active-game-page.component.html',
    styleUrls: ['./active-game-page.component.scss'],
    imports: [
        ActiveGridComponent,
        LogChatComponent,
        TimerComponent,
        PlayerPanelComponent,
        PlayerListComponent,
        VsPopUpComponent,
        GameInfoComponent,
        InventoryPopUpComponent,
        MatTooltip,
    ],
    providers: [
        ChatService,
        ActionService,
        CombatService,
        TimeService,
        TurnService,
        ActiveGridService,
        GameOverService,
        DebugService,
        PlayerMovementService,
        LogService,
        ItemService,
    ],

    standalone: true,
})
export class ActiveGamePageComponent implements OnInit, OnDestroy {
    @ViewChild('vsPopup') vsPopUpComponent!: VsPopUpComponent;
    private _isMyTurn: boolean = false;
    private _isTurnPopupVisible: boolean = false;
    private _isCombatStarted: boolean = false;
    private _startCombatSubscription: Subscription;
    private _endCombatSubscription: Subscription;
    private _turnSubscription: Subscription;
    private _gameOverSubscription: Subscription;
    private _combatActionSubscription: Subscription;
    private _isGameStart: boolean = true;

    constructor(
        private actionService: ActionService,
        private turnService: TurnService,
        private gameOverService: GameOverService,
        private playerService: PlayerService,
        private activeGridService: ActiveGridService,
    ) {}

    get isTurnPopupVisible() {
        return this._isTurnPopupVisible;
    }

    get isMyTurn() {
        return this._isMyTurn;
    }

    get isMoving() {
        return this.activeGridService.isMoving;
    }

    get isCombatStarted() {
        return this._isCombatStarted;
    }

    get isActionClicked() {
        return this.actionService.isActionClicked;
    }

    onContextMenu(event: MouseEvent) {
        event.preventDefault();
    }

    isGameStart() {
        return this._isGameStart;
    }

    isCTF() {
        return this.activeGridService.isCTF();
    }
    isAction() {
        this.actionService.isActionClicked = !this.actionService.isActionClicked;
        if (this.actionService.isActionClicked) {
            this.activeGridService.deselectPlayer();
        } else {
            this.activeGridService.findAndSelectPlayer();
        }
    }

    hasActionLeft() {
        return this.actionService.hasActionLeft;
    }

    getAdjacentPlayerOrDoor() {
        return this.actionService.getAdjacentPlayerOrDoor();
    }
    ngOnInit() {
        this._turnSubscription = combineLatest([this.turnService.getCurrentTurn(), this.turnService.blockPlaying]).subscribe(
            ([player, blockPlaying]) => {
                if (player) {
                    this._isGameStart = false;
                }
                this._isMyTurn = this.turnService.isMyTurn();
                if (this._isMyTurn && !blockPlaying) {
                    this.actionService.isActionClicked = false;
                    this.resetSpeed(this.turnService.playerLastPosition);
                    this.showTurnPopup();
                }
            },
        );
        this._gameOverSubscription = combineLatest([this.gameOverService.getGameOverStatus(), this.gameOverService.getWinner()]).subscribe(
            ([isGameOver, winner]) => {
                const grid = this.activeGridService.gridSubject.getValue();
                if (!grid) return;
                this.gameOverService.handleGameOver(isGameOver, winner, this.turnService.getPlayer());
            },
        );
        this._combatActionSubscription = this.actionService.hasActionLeftSubject.subscribe((hasActionLeft) => {
            if (!hasActionLeft && this._isMyTurn) {
                this.activeGridService.findAndSelectPlayer();
            }
        });
        this.gameOverService.init();
        this.listenerStartCombat();
        this.listenerEndCombat();
    }

    ngOnDestroy() {
        if (this._turnSubscription) {
            this._turnSubscription.unsubscribe();
        }
        if (this._gameOverSubscription) {
            this._gameOverSubscription.unsubscribe();
        }
        if (this._startCombatSubscription) {
            this._startCombatSubscription.unsubscribe();
        }
        if (this._endCombatSubscription) {
            this._endCombatSubscription.unsubscribe();
        }
        if (this._combatActionSubscription) {
            this._combatActionSubscription.unsubscribe();
        }
        this.turnService.ngOnDestroy();
        this.gameOverService.cleanup();
    }

    listenerStartCombat() {
        this._startCombatSubscription = this.actionService.onCombatStart.subscribe(() => {
            this._isCombatStarted = true;
            this.vsPopUpComponent.initiateFight();
        });
    }

    listenerEndCombat() {
        this._endCombatSubscription = this.actionService.onCombatEnded.subscribe(() => {
            this.vsPopUpComponent.endFight();
            this._isCombatStarted = false;
        });
    }

    escapeAction() {
        this.actionService.sendCombatAction(this.playerService.roomId, this.playerService.player as Player, Actions.Escape);
    }

    attackAction() {
        this.actionService.sendCombatAction(this.playerService.roomId, this.playerService.player as Player, Actions.Attack);
    }

    quitGame() {
        this.playerService.quitGame();
    }

    nextTurn() {
        this.actionService.hasActionLeftSubject.next(true);
        this.turnService.nextTurn();
    }

    private showTurnPopup() {
        this._isTurnPopupVisible = true;
        setTimeout(() => {
            this._isTurnPopupVisible = false;
        }, POPUP_LENGTH);
    }

    private resetSpeed(position: Position | undefined) {
        if (!position) {
            return;
        }
        const grid = this.activeGridService.gridSubject.getValue();
        if (grid && grid.board[position.x][position.y].player) {
            const player = grid.board[position.x][position.y].player;
            if (player && player.stats && player.stats.maxSpeed) {
                player.stats.speed = player.stats.maxSpeed;
                grid.board[position.x][position.y].player = player;
            }
        }
    }
}
