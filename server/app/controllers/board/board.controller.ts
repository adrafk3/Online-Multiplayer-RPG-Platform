import { CreateGameDto } from '@app/model/dto/create-game.dto';
import { BoardService } from '@app/services/board/board.service';
import { GameRoomService } from '@app/services/game-room/game-room.service';
import { StartGameService } from '@app/services/start-game/start-game.service';
import { Grid } from '@common/interfaces';
import { Body, Controller, Delete, Get, HttpStatus, Logger, Param, Patch, Post, Res } from '@nestjs/common';
import { Mutex } from 'async-mutex';
import { Response } from 'express';

@Controller('game')
export class BoardController {
    private mutex = new Mutex();
    constructor(
        private readonly logger: Logger,
        private readonly boardService: BoardService,
        private startGameService: StartGameService,
        private gameRoomService: GameRoomService,
    ) {}

    @Get()
    async getAllGames(@Res() response: Response): Promise<void> {
        try {
            const games = await this.boardService.getAllGames();
            if (games) {
                response.status(HttpStatus.OK).json(games);
            }
        } catch (error) {
            this.logger.error('Erreur lors de la récupération des jeux');
            response.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Internal server error');
        }
    }

    @Post('/start')
    async startGame(@Body('roomId') roomId: string, @Res() response: Response): Promise<void> {
        await this.mutex.runExclusive(async () => {
            const room = this.gameRoomService.rooms.get(roomId);
            if (room && room.map) {
                response.status(HttpStatus.OK).json({ map: room.map, teams: room.teams });
            } else {
                try {
                    this.logger.log(`Initialized game for room: ${roomId}`);
                    room.map = (await this.startGameService.placePlayersOnStartingPoints(roomId)) as Grid;
                    room.teams = this.startGameService.getTeams(roomId);
                    response.status(HttpStatus.OK).json({ map: room.map, teams: room.teams });
                } catch (error) {
                    response.status(HttpStatus.NOT_FOUND).send("La carte n'existe plus");
                }
            }
        });
    }

    @Get(':id')
    async getGame(@Param('id') id: string, @Res() response: Response): Promise<void> {
        try {
            const game = await this.boardService.getGameById(id);
            if (game) {
                response.status(HttpStatus.OK).json(game);
            }
        } catch (error) {
            this.logger.error(`Erreur lors de la récupération du jeu: ${id}`);
            response.status(HttpStatus.NOT_FOUND).send('Jeu introuvable');
        }
    }

    @Post()
    async validateGameMap(@Body() gameData: CreateGameDto, @Res() response: Response): Promise<void> {
        try {
            const errors = await this.boardService.validateAndSaveGame(gameData);
            if (errors.length > 0) {
                this.logger.error('Erreur lors de la validation de la map');
                throw new Error('Erreurs de validation trouver');
            }

            response.status(HttpStatus.CREATED).json(errors);
        } catch (error) {
            this.logger.error('Erreur lors de la validation de la map');
            response.status(HttpStatus.BAD_REQUEST).send('Jeu non conforme');
        }
    }

    @Patch(':id')
    async editingGame(@Body() gameData: CreateGameDto, @Param('id') id: string, @Res() response: Response): Promise<void> {
        try {
            this.logger.log(`Modification du jeu: ${id}`);
            const result = await this.boardService.modifyGame(id, gameData);
            response.status(HttpStatus.OK).json(result);
        } catch (error) {
            this.logger.error(`Erreur de modification pour le jeu avec ID: ${id}`);
            response.status(HttpStatus.NOT_FOUND).send('Jeu introuvable');
        }
    }

    @Delete(':id')
    async deleteGame(@Param('id') id: string, @Res() response: Response): Promise<void> {
        try {
            await this.boardService.deleteGameById(id);
            response.status(HttpStatus.NO_CONTENT).send();
        } catch (error) {
            this.logger.error(`Erreur lors de la deletion du jeu: ${id}`);
            response.status(HttpStatus.NOT_FOUND).send('Jeu introuvable');
        }
    }

    @Patch('isHidden/:id')
    async updateVisibility(@Param('id') id: string, @Res() response: Response): Promise<void> {
        try {
            const game = await this.boardService.toggleGameVisibility(id);
            response.status(HttpStatus.OK).json(game);
        } catch (error) {
            this.logger.error(`Erreur lors de la modification de la visibilite du jeu: ${id}`);
            response.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Internal server error');
        }
    }
}
