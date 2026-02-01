import { FULL_PERCENT } from '@common/constants';
import { TileTypes } from '@common/enums';
import { Grid, Player, RoomData } from '@common/interfaces';
import { Position } from '@common/types';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EndGameService {
    setGlobalStats(room: RoomData) {
        room.players.forEach((player) => {
            this.setTilesVisitedPercentage(room, player, player.startingPoint);
        });
        const totalDoors = this.findTotalDoors(room.map);
        if (totalDoors > 0) room.globalStats.doorsUsedPercent = (room.globalStats.doorsUsed.length / totalDoors) * FULL_PERCENT;
        room.globalStats.duration = this.getDuration(room);
    }

    setTilesVisitedPercentage(room: RoomData, movingPlayer: Player, nextPosition: Position) {
        if (!room || !movingPlayer) return;

        const totalValidTiles = this.getTotalValidTiles(room.map);

        if (!movingPlayer.playerStats.tilesVisited.some((tile) => tile.x === nextPosition.x && tile.y === nextPosition.y)) {
            movingPlayer.playerStats.tilesVisited.push(nextPosition);

            if (room.map) {
                const percentage = (movingPlayer.playerStats.tilesVisited.length / totalValidTiles) * FULL_PERCENT;
                movingPlayer.playerStats.tilesVisitedPercentage = parseFloat(percentage.toFixed(2));
            }
        }
        if (!room.globalStats.tilesVisited.some((tile) => tile.x === nextPosition.x && tile.y === nextPosition.y)) {
            room.globalStats.tilesVisited.push(nextPosition);

            if (room.map) {
                const percentage = (room.globalStats.tilesVisited.length / totalValidTiles) * FULL_PERCENT;
                room.globalStats.tilesVisitedPercentage = parseFloat(percentage.toFixed(2));
            }
        }
    }

    getDuration(room: RoomData): number {
        if (room && room.startTime) {
            const endTime = new Date();
            return endTime.getTime() - room.startTime.getTime();
        } else return 0;
    }

    private getTotalValidTiles(grid: Grid): number {
        let validTiles = 0;

        if (!grid.board) return validTiles;

        for (const row of grid.board) {
            for (const tile of row) {
                if (tile.tile !== TileTypes.Wall) {
                    validTiles++;
                }
            }
        }
        return validTiles;
    }

    private findTotalDoors(grid: Grid): number {
        let nDoors = 0;

        if (!grid.board) return nDoors;

        for (const row of grid.board) {
            for (const tile of row) {
                if (tile.tile === TileTypes.Door || tile.tile === TileTypes.OpenedDoor) {
                    nDoors++;
                }
            }
        }
        return nDoors;
    }
}
