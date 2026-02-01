import { CommonModule, NgStyle } from '@angular/common';
import { Component, EventEmitter, inject, OnDestroy, OnInit, Output } from '@angular/core';
import { PopUpData } from '@app/interfaces/popUp.interface';
import { ActionService } from '@app/services/action/action.service';
import { ActiveGridService } from '@app/services/active-grid/active-grid.service';
import { AlertService } from '@app/services/alert/alert.service';
import { GameModeService } from '@app/services/game-mode/game-mode.service';
import { PlayerService } from '@app/services/player/player.service';
import { TurnService } from '@app/services/turn/turn-service';
import { AVATARS } from '@common/avatar';
import { DEBOUNCE_TIME, ITEM_IMAGE_MAP, TILE_IMAGES } from '@common/constants';
import { Actions, Directions, ItemId, ItemTypes, TileTypes } from '@common/enums';
import { Grid, Player } from '@common/interfaces';
import { Position } from '@common/types';
import { Subject, Subscription, takeUntil } from 'rxjs';

@Component({
    selector: 'app-active-grid',
    standalone: true,
    templateUrl: './active-grid.component.html',
    styleUrls: ['./active-grid.component.scss'],
    imports: [NgStyle, CommonModule],
})
export class ActiveGridComponent implements OnInit, OnDestroy {
    @Output() gridInitialized = new EventEmitter<Grid>();
    @Output() visibilityChange = new EventEmitter<boolean>();
    private _grid: Grid;
    private _activeGrid: Subscription;
    private _destroy$ = new Subject<void>();
    private hasBeenCalled = false;
    private alertService = inject(AlertService);

    constructor(
        private activeGridService: ActiveGridService,
        private playerService: PlayerService,
        private actionService: ActionService,
        private turnService: TurnService,
        private gameModeService: GameModeService,
    ) {}

    get grid() {
        return this._grid;
    }

    get isActionClicked() {
        return this.actionService.isActionClicked;
    }

    isTeamMember(rowIndex: number, colIndex: number): boolean {
        const player = this.grid?.board[rowIndex][colIndex]?.player;
        if (player && this.gameModeService.isCtf()) {
            return this.gameModeService.isPartOfOwnTeam(player.id);
        }
        return false;
    }

    ngOnInit() {
        this.actionService.toggleDoorListener(this.activeGridService.gridSubject);
        this.activeGridService.loadGrid(this.playerService.roomId);
        this.activeGridService.grid$.subscribe((grid) => {
            if (grid) {
                this._grid = grid;
                this.gameModeService.onInit();
            }
        });
        this.activeGridService.init();
        this.actionService.hasActionLeftSubject.pipe(takeUntil(this._destroy$)).subscribe((hasActionsLeft) => {
            if (!hasActionsLeft && this.turnService.isMyTurn()) {
                this.activeGridService.findAndSelectPlayer();
            }
            this.checkAndProcessTurnEnd(hasActionsLeft || this.activeGridService.canStillMove.getValue());
        });
        this.activeGridService.canStillMove.pipe(takeUntil(this._destroy$)).subscribe((canStillMove) => {
            this.checkAndProcessTurnEnd(canStillMove || (this.actionService.hasActionLeft && this.actionService.getAdjacentPlayerOrDoor()));
            if (this.turnService.isMyTurn() && !this.activeGridService.isMoving) {
                this.activeGridService.deselectPlayer();
                this.activeGridService.findAndSelectPlayer();
            }
        });
    }

    ngOnDestroy() {
        if (this._activeGrid) {
            this._activeGrid.unsubscribe();
        }
        this._destroy$.next();
        this._destroy$.complete();
        this.activeGridService.ngOnDestroy();
        this.gameModeService.onReset();
    }

    tileClick(event: MouseEvent, position: Position) {
        return this.activeGridService.handleClick({ event, position, grid: this._grid });
    }

    onRightClick(event: MouseEvent, position: Position) {
        event.preventDefault();
        const data = this.tileClick(event, position);
        if (data && !this.activeGridService.isDebug) {
            this.openInfo(data as PopUpData, event);
        }
    }

    onTileDoubleClick(event: Position) {
        const { x, y } = event;
        const cell = this._grid.board[x][y];

        if (this.actionService.isActionClicked && !this.activeGridService.isMoving && !this.isTeamMember(event.x, event.y)) {
            this.activeGridService.deselectPlayer();

            if (this.isDoor(x, y)) {
                const newState = cell.tile === TileTypes.Door ? TileTypes.OpenedDoor : TileTypes.Door;
                this.actionService.sendToggledDoor({ x, y }, this.playerService.roomId, newState);
            } else {
                const currentPlayerPosition = this.actionService.getPlayerPosition(this._grid) as Position;

                if (this.actionService.isAdjacent(currentPlayerPosition, { x, y }) && this.activeGridService.isOpposingPlayer(event)) {
                    this.actionService.isCombat = !!cell.canCombat;
                    this.startCombat();
                }
            }

            this.actionService.isActionClicked = false;
        }
    }

    startCombat() {
        if (this.turnService.timeLeft <= 0) return;
        this.turnService.freezeTurn();
        this.actionService.sendCombatInit(this.playerService.roomId, this.playerService.player, Actions.StartCombat);
    }

    getAdjacentPlayers(rowIndex: number, colIndex: number) {
        const position: Position = { x: rowIndex, y: colIndex };
        return this.actionService.isSpecificPlayerAdjacent(position, this.playerService.player.id, this._grid);
    }

    isDefined() {
        return !!this._grid;
    }

    isDoor(rowIndex: number, colIndex: number) {
        const tile = this._grid.board[rowIndex][colIndex].tile;
        return (
            (tile === TileTypes.Door || tile === TileTypes.OpenedDoor) &&
            this.isMyTurn() &&
            !this.grid.board[rowIndex][colIndex].player &&
            !this.grid.board[rowIndex][colIndex].item.name &&
            this.getIsAction() &&
            this.getAdjacentPlayers(rowIndex, colIndex) &&
            this.hasActionsLeft()
        );
    }

    getTileImage(rowIndex: number, colIndex: number) {
        return TILE_IMAGES.get(this._grid.board[rowIndex][colIndex].tile) as string;
    }

    getItemImage(itemName: string): string {
        if (itemName.includes(ItemTypes.StartingPoint)) {
            return ITEM_IMAGE_MAP[ItemId.ItemStartingPoint];
        }
        return ITEM_IMAGE_MAP[itemName as ItemId];
    }

    getPlayerAvatar(rowIndex: number, colIndex: number): string {
        const player = this._grid?.board[rowIndex][colIndex]?.player;
        return player?.avatar ? AVATARS.find((avatar) => avatar.name === player.avatar)?.idle ?? AVATARS[0].idle : AVATARS[0].idle;
    }

    getTileSize() {
        return `calc(97vmin / ${this._grid?.gridSize})`;
    }

    onTileHovered(position: Position) {
        this.activeGridService.handleHovered(position);
    }

    onTileUnhovered() {
        this.activeGridService.handleUnhovered();
    }

    getReachableTile(position: Position) {
        return this.activeGridService.getReachableTile(position);
    }

    getHighlightedTile(position: Position) {
        return this.activeGridService.getHighlightedTile(position);
    }

    isCurrentUserPlayer(rowIndex: number, colIndex: number): boolean {
        const player = this.grid?.board[rowIndex][colIndex]?.player;
        return player?.id === this.playerService.player.id;
    }

    isMyTurn() {
        return this.turnService.isMyTurn();
    }

    getIsAction() {
        return this.actionService.isActionClicked;
    }

    getPlayerLastDirection(rowIndex: number, colIndex: number): string {
        return this.grid?.board?.[rowIndex]?.[colIndex]?.player?.lastDirection || Directions.Right;
    }

    hasActionsLeft() {
        return this.actionService.hasActionLeft;
    }

    canCombat(rowIndex: number, colIndex: number) {
        return (
            this.grid.board[rowIndex][colIndex].canCombat &&
            this.grid.board[rowIndex][colIndex].player &&
            this.isMyTurn() &&
            this.getIsAction() &&
            this.getAdjacentPlayers(rowIndex, colIndex) &&
            this.hasActionsLeft()
        );
    }

    makeStartingPointGlow(rowIndex: number, colIndex: number) {
        return this.gameModeService.makeStartingPointGlow(rowIndex, colIndex);
    }

    showFlagHolder(player: Player | undefined) {
        return this.gameModeService.showFlagHolder(player);
    }

    private openInfo(data: PopUpData, event: MouseEvent) {
        this.alertService.tileInfo(data, event);
    }

    private checkAndProcessTurnEnd(condition: boolean) {
        if (
            !this.actionService.isCombat &&
            !this.turnService.isBlocking &&
            this.turnService.isMyTurn() &&
            !condition &&
            !this.activeGridService.getIsIceAdjacent() &&
            this.turnService.timeLeft !== 0
        ) {
            this.processTurnEnd();
        }
    }

    private processTurnEnd() {
        if (!this.hasBeenCalled) {
            this.actionService.hasActionLeftSubject.next(true);
            this.turnService.nextTurn();
            this.activeGridService.canStillMove.next(true);
            this.hasBeenCalled = true;
            setTimeout(() => {
                this.hasBeenCalled = false;
            }, DEBOUNCE_TIME);
        }
    }
}
