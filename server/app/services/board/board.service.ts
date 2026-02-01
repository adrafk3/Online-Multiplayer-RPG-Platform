import { Game, GameDocument } from '@app/model/database/game';
import { CreateGameDto } from '@app/model/dto/create-game.dto';
import { ERROR_CODE_MONGODB, FULL_PERCENT, HALF_PERCENT, VALID_TERRAINS } from '@common/constants';
import { GameModes, ItemCounts, ItemTypes, TileTypes } from '@common/enums';
import { BoardCell } from '@common/interfaces';
import { dfs } from '@common/shared-utils';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

const gridSizeItems = new Map<string, number>([
    ['10', ItemCounts.SmallItem],
    ['15', ItemCounts.MediumItem],
    ['20', ItemCounts.BigItem],
]);

@Injectable()
export class BoardService {
    constructor(
        @InjectModel(Game.name) public gameModel: Model<GameDocument>,
        private readonly logger: Logger,
    ) {
        this.logger.log('BoardService initialise.');
    }

    async getAllGames(): Promise<CreateGameDto[]> {
        const games = await this.gameModel.find();
        if (!games || games.length === 0) {
            throw new HttpException('Aucun jeu trouve', HttpStatus.NOT_FOUND);
        }
        return games;
    }

    async getGameById(id: string): Promise<CreateGameDto> {
        const game = await this.gameModel.findById(id);
        if (!game) {
            this.logger.warn(`Jeu avec ID ${id} pas trouve`);
            throw new HttpException('Le jeu est introuvable', HttpStatus.NOT_FOUND);
        }
        return game;
    }

    async deleteGameById(id: string): Promise<void> {
        const game = await this.gameModel.findById(id);

        if (!game) {
            this.logger.warn(`Jeu avec ID ${id} introuvable`);
            throw new HttpException('Le jeu est introuvable', HttpStatus.NOT_FOUND);
        }

        await this.gameModel.deleteOne({ _id: id });
        this.logger.log(`Jeu avec ID ${id} a ete supprime`);
    }

    async toggleGameVisibility(id: string): Promise<CreateGameDto> {
        const game = await this.gameModel.findById(id);

        if (!game) {
            this.logger.warn(`Jeu avec ID ${id} introuvable`);
            throw new HttpException('Le jeu est introuvable', HttpStatus.NOT_FOUND);
        }

        game.isHidden = !game.isHidden;
        await game.save();
        return game;
    }

    async validateAndSaveGame(gameData: CreateGameDto): Promise<string[]> {
        const errors: string[] = await this.validateGameMapFromFrontend(gameData);

        if (errors.length === 0) {
            try {
                const savedGame = new this.gameModel(gameData);
                await savedGame.save();
                this.logger.log('Jeu sauvegardé');
            } catch (error) {
                if (error.code === ERROR_CODE_MONGODB) {
                    this.logger.error(`Le jeu avec le nom "${gameData.name}" existe déjà.`);
                    throw new HttpException(`Un jeu avec le nom "${gameData.name}" existe déjà.`, HttpStatus.BAD_REQUEST);
                } else {
                    this.logger.error('Erreur lors de la sauvegarde', error);
                    throw new HttpException('Erreur lors de la sauvegarde du jeu', HttpStatus.INTERNAL_SERVER_ERROR);
                }
            }
        }
        return errors;
    }
    async validateGameMapFromFrontend(gameData: CreateGameDto): Promise<string[]> {
        const errors: string[] = [];
        const { board, gridSize } = gameData;

        this.validateDoors(board, gridSize, errors);
        this.validateAccessibility(board, errors);
        this.validateTerrainCoverage(board, errors);
        this.validateGameRules(gameData, errors);

        if (errors.length) throw new HttpException(errors, HttpStatus.BAD_REQUEST);

        return errors;
    }

    async modifyGame(gameId: string, updatedData: CreateGameDto): Promise<string[]> {
        const errors: string[] = await this.validateGameMapFromFrontend(updatedData);
        if (errors.length) throw new HttpException(errors, HttpStatus.BAD_REQUEST);

        try {
            const existingGame = await this.gameModel.findOneAndUpdate(
                { _id: gameId },
                { ...updatedData, lastModified: new Date().toISOString() },
                { new: true, upsert: false },
            );

            if (!existingGame) {
                this.logger.error(`Jeu avec ID ${gameId} pas trouvé. Création d'un nouveau jeu.`);
                await new this.gameModel({ ...updatedData, lastModified: new Date().toISOString() }).save();
            }

            this.logger.log(`Jeu avec ID ${gameId} ${existingGame ? 'modifié' : 'créé'} avec succès.`);
        } catch (error) {
            this.logger.error('Erreur lors de la modification du jeu:', error);
            throw new HttpException('Erreur lors de la modification du jeu.', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        return errors;
    }

    private validateDoors(board: BoardCell[][], gridSize: number, errors: string[]) {
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const tile = board[row]?.[col]?.tile;
                if ([TileTypes.Door, TileTypes.OpenedDoor].includes(tile) && !this.isDoorValid(board, row, col)) {
                    errors.push(`Placement de porte invalide à ligne ${row + 1}, colonne ${col + 1}.`);
                }
            }
        }
    }

    private validateAccessibility(board: BoardCell[][], errors: string[]) {
        if (!this.areTerrainsAccessible(board)) {
            errors.push('Certaines tuiles sont inaccessibles');
        }
    }

    private validateTerrainCoverage(board: BoardCell[][], errors: string[]) {
        const terrainPercentage = this.calculateTerrainPercentage(board);
        if (terrainPercentage <= HALF_PERCENT) {
            errors.push(`Tuiles de terrain occupent seulement ${terrainPercentage}% de la map.`);
        }
    }

    private validateGameRules(gameData: CreateGameDto, errors: string[]) {
        if (!this.allStartingPointsPlaced(gameData)) errors.push('Pas tous les points de départ ont été placés');
        if (!this.correctNumberOfItemsPlaced(gameData)) errors.push("Pas assez d'items ont été placés");
        if (gameData.gameMode === GameModes.CTF && !this.isFlagPlaced(gameData.board)) errors.push('Flag pas placé pour mode Capture The Flag.');
        if (!this.validateItems(gameData.board)) errors.push('Les items ne peuvent pas être sur des tuiles de Mur');
    }
    private isWall(tile: TileTypes): boolean {
        return tile === TileTypes.Wall;
    }

    private isValidTerrain(tile: TileTypes, terrain: Set<TileTypes>): boolean {
        return terrain.has(tile);
    }

    private isDoorValid(board: BoardCell[][], row: number, col: number): boolean {
        const terrain = [TileTypes.Default, TileTypes.Ice, TileTypes.Water];
        const terrainSet = new Set(terrain);

        const tileUp = (board[row - 1] as BoardCell[])[col].tile as TileTypes;
        const tileDown = (board[row + 1] as BoardCell[])[col].tile as TileTypes;
        const tileLeft = (board[row] as BoardCell[])[col - 1].tile as TileTypes;
        const tileRight = (board[row] as BoardCell[])[col + 1].tile as TileTypes;

        const horizontalValid =
            this.isWall(tileLeft) && this.isWall(tileRight) && this.isValidTerrain(tileUp, terrainSet) && this.isValidTerrain(tileDown, terrainSet);
        const verticalValid =
            this.isWall(tileUp) && this.isWall(tileDown) && this.isValidTerrain(tileLeft, terrainSet) && this.isValidTerrain(tileRight, terrainSet);
        return horizontalValid || verticalValid;
    }

    private areTerrainsAccessible(board: BoardCell[][]): boolean {
        const rows = board.length;
        const cols = board[0].length;
        let startX = -1;
        let startY = -1;
        const terrainSet = new Set<string>();
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const itemName = board[i][j].item.name;
                const tileName = board[i][j].tile;
                if (itemName.includes(ItemTypes.StartingPoint)) {
                    startX = i;
                    startY = j;
                }
                if (VALID_TERRAINS.has(tileName)) {
                    terrainSet.add(`${i},${j}`);
                }
            }
        }
        if (startX === -1 || startY === -1) {
            return false;
        }
        const visited = new Set<string>();
        dfs({ x: startX, y: startY }, board, visited);
        for (const tile of terrainSet) {
            if (!visited.has(tile)) {
                return false;
            }
        }

        return true;
    }

    private calculateTerrainPercentage(board: BoardCell[][]): number {
        const terrain = [TileTypes.Ice, TileTypes.Water, TileTypes.Default, TileTypes.Door, TileTypes.OpenedDoor];
        const totalTiles = board.length * board[0].length;
        const terrainTiles = board.flat().filter((tile) => terrain.includes(tile.tile)).length;
        return (terrainTiles / totalTiles) * FULL_PERCENT;
    }

    private allStartingPointsPlaced(game: CreateGameDto): boolean {
        const requiredStartingPoints = gridSizeItems.get(game.gridSize.toString());
        const actualStartingPoints = game.board.flat().filter((tile) => tile.item.name.includes(ItemTypes.StartingPoint)).length;
        return actualStartingPoints === requiredStartingPoints;
    }

    private correctNumberOfItemsPlaced(game: CreateGameDto): boolean {
        const requiredItems = gridSizeItems.get(game.gridSize.toString());

        const actualItems = game.board
            .flat()
            .filter(
                (tile) =>
                    tile.item.name &&
                    tile.item.name !== '' &&
                    !tile.item.name.includes(ItemTypes.StartingPoint) &&
                    !tile.item.name.includes(ItemTypes.Flag),
            ).length;

        return actualItems === requiredItems;
    }

    private isFlagPlaced(board: BoardCell[][]): boolean {
        return board.flat().some((tile) => tile.item.name.includes(ItemTypes.Flag));
    }

    private validateItems(board: BoardCell[][]): boolean {
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
