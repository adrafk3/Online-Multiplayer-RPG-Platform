import { GRID_SIZE_ITEMS, VALID_TERRAINS, HALF_PERCENT, FULL_PERCENT } from '@common/constants';
import { GameModes, ItemTypes, TileTypes } from '@common/enums';
import { BoardCell } from '@common/interfaces';
import { dfs } from '@common/shared-utils';
import { GridGame } from '@app/classes/grid/grid';
import { VerifierAnswer } from '@app/enums/grid-verifier-enums';

export class GridVerifier {
    static validateGameMapFromFrontend(game: GridGame): string {
        const { grid } = game;

        let errors = '';

        if (this.areTerrainsAccessible(game)) {
            errors += this.areTerrainsAccessible(game);
        }

        if (this.calculateTerrainPercentage(grid) < HALF_PERCENT) {
            errors += `${VerifierAnswer.CalculateTerrainFirst} ${Math.floor(this.calculateTerrainPercentage(grid))}${
                VerifierAnswer.CalculateTerrainSecond
            }`;
        }

        if (!this.correctNumberOfItemsPlaced(game)) {
            errors += VerifierAnswer.CorrectItems;
        }

        if (game.gameMode === GameModes.CTF && !this.isFlagPlaced(grid)) {
            errors += VerifierAnswer.FlagPlaced;
        }

        if (!this.validateItems(grid)) {
            errors += VerifierAnswer.ValidateItems;
        }

        if (!this.areDoorsValid(game)) {
            errors += VerifierAnswer.DoorsValid;
        }

        if (!this.allStartingPointsPlaced(game)) {
            errors += VerifierAnswer.StartingPoint;
        }

        return errors;
    }

    private static isDoorValid(grid: BoardCell[][], row: number, col: number): boolean {
        const terrain = [TileTypes.Default, TileTypes.Ice, TileTypes.Water];

        const isValidRow = row >= 0 && row < grid.length;
        const isValidCol = col >= 0 && col < grid[0].length;

        if (!isValidRow || !isValidCol) return false;

        const horizontalValid =
            grid[row]?.[col - 1]?.tile === TileTypes.Wall &&
            grid[row]?.[col + 1]?.tile === TileTypes.Wall &&
            terrain.includes(grid[row - 1]?.[col]?.tile as TileTypes) &&
            terrain.includes(grid[row + 1]?.[col]?.tile as TileTypes);

        const verticalValid =
            grid[row - 1]?.[col]?.tile === TileTypes.Wall &&
            grid[row + 1]?.[col]?.tile === TileTypes.Wall &&
            terrain.includes(grid[row]?.[col - 1]?.tile as TileTypes) &&
            terrain.includes(grid[row]?.[col + 1]?.tile as TileTypes);

        return horizontalValid || verticalValid;
    }

    private static areDoorsValid(game: GridGame): boolean {
        const portes = [TileTypes.OpenedDoor, TileTypes.Door];

        for (let i = 0; i < game.size; i++) {
            for (let j = 0; j < game.size; j++) {
                if (portes.includes(game.grid[i][j].tile as TileTypes)) {
                    if (!this.isDoorValid(game.grid, i, j)) return false;
                }
            }
        }
        return true;
    }

    private static calculateTerrainPercentage(grid: BoardCell[][]): number {
        const terrainTiles = [TileTypes.Water, TileTypes.Ice, TileTypes.Default];
        const totalTiles = grid.length * grid[0].length;
        const totalTerrainTiles = grid.flat().filter((tile) => terrainTiles.includes(tile.tile as TileTypes)).length;
        return (totalTerrainTiles / totalTiles) * FULL_PERCENT;
    }

    private static allStartingPointsPlaced(game: GridGame): boolean {
        const requiredStartingPoints = GRID_SIZE_ITEMS.get(game.size.toString());
        const actualStartingPoints = game.grid.flat().filter((tile) => tile.item?.name.includes(ItemTypes.StartingPoint)).length;
        return actualStartingPoints === requiredStartingPoints;
    }

    private static areTerrainsAccessible(game: GridGame): string {
        let error = '';
        const rows = game.grid.length;
        const cols = game.grid[0].length;
        let startX = 0;
        let startY = 0;
        const terrainSet = new Set<string>();
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const tileName = game.grid[i][j]?.tile as TileTypes;
                if (VALID_TERRAINS.has(tileName)) {
                    terrainSet.add(`${i},${j}`);
                    startX = i;
                    startY = j;
                }
            }
        }
        if (terrainSet.size === 0) {
            error += VerifierAnswer.InaccessibleTiles;
        }
        const visited = new Set<string>();
        dfs({ x: startX, y: startY }, game.grid, visited);

        for (const tile of terrainSet) {
            if (!visited.has(tile)) {
                error += VerifierAnswer.InaccessibleTiles;
                return error;
            }
        }
        return error;
    }

    private static correctNumberOfItemsPlaced(game: GridGame): boolean {
        const requiredItems = GRID_SIZE_ITEMS.get(game.size.toString());
        const actualItems = game.grid
            .flat()
            .filter(
                (tile) => tile.item.name && !tile.item?.name.includes(ItemTypes.StartingPoint) && !tile.item?.name.includes(ItemTypes.Flag),
            ).length;
        return actualItems === requiredItems;
    }

    private static isFlagPlaced(grid: BoardCell[][]): boolean {
        return grid.flat().some((tile) => tile.item?.name.includes(ItemTypes.Flag));
    }

    private static validateItems(board: BoardCell[][]): boolean {
        for (const row of board) {
            for (const cell of row) {
                if (cell.tile === TileTypes.Wall && cell.item.name) {
                    return false;
                }
            }
        }
        return true;
    }
}
