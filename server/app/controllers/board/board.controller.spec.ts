import { MOCK_ROOMS } from '@app/constants/test-consts';
import { Game } from '@app/model/database/game';
import { getValidFakeGame } from '@app/constants/board-service-constants';
import { BoardService } from '@app/services/board/board.service';
import { GameRoomService } from '@app/services/game-room/game-room.service';
import { StartGameService } from '@app/services/start-game/start-game.service';
import { GAME_DATA, validGameId } from '@common/constants.spec';
import { HttpStatus, Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { BoardController } from './board.controller';

describe('BoardController', () => {
    let controller: BoardController;
    let boardService: jest.Mocked<BoardService>;
    let startGameService: jest.Mocked<StartGameService>;
    let gameRoomService: jest.Mocked<GameRoomService>;

    beforeEach(async () => {
        boardService = {
            getAllGames: jest.fn(),
            getGameById: jest.fn(),
            validateAndSaveGame: jest.fn(),
            modifyGame: jest.fn(),
            deleteGameById: jest.fn(),
            toggleGameVisibility: jest.fn(),
        } as unknown as jest.Mocked<BoardService>;

        const mockLogger = {
            log: jest.fn(),
            error: jest.fn(),
        };

        startGameService = {
            initPlayers: jest.fn(),
            placePlayersOnStartingPoints: jest.fn(),
            getGame: jest.fn(),
            getTeams: jest.fn(),
        } as unknown as jest.Mocked<StartGameService>;

        gameRoomService = {
            rooms: MOCK_ROOMS,
        } as unknown as jest.Mocked<GameRoomService>;

        const module: TestingModule = await Test.createTestingModule({
            controllers: [BoardController],
            providers: [
                { provide: BoardService, useValue: boardService },
                { provide: StartGameService, useValue: startGameService },
                { provide: Logger, useValue: mockLogger },
                { provide: GameRoomService, useValue: gameRoomService },
            ],
        }).compile();

        controller = module.get<BoardController>(BoardController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('getAllGames() should return all games', async () => {
        const fakeGames = [new Game(), new Game()];

        boardService.getAllGames.mockResolvedValue(fakeGames);

        const res = {} as unknown as Response;

        res.status = (code) => {
            expect(code).toEqual(HttpStatus.OK);
            return res;
        };
        res.json = (games) => {
            expect(games).toEqual(fakeGames);
            return res;
        };

        await controller.getAllGames(res);
    });

    it('getAllGames() should return InternalServerError when service unable to fetch games', async () => {
        boardService.getAllGames.mockRejectedValue([]);

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.INTERNAL_SERVER_ERROR);
            return res;
        };
        res.send = () => res;

        await controller.getAllGames(res);
    });

    it('getGame() should return the game', async () => {
        const fakeGame = new Game();
        boardService.getGameById.mockResolvedValue(fakeGame);

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.OK);
            return res;
        };
        res.json = (courses) => {
            expect(courses).toEqual(fakeGame);
            return res;
        };

        await controller.getGame('', res);
    });

    it('getGame() should return NotFound when service unable to fetch the game', async () => {
        boardService.getGameById.mockRejectedValue([]);

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.NOT_FOUND);
            return res;
        };
        res.send = () => res;

        await controller.getGame('', res);
    });

    it('validateGameMap() should succeed if service is able to validate and add the game', async () => {
        jest.spyOn(boardService, 'validateAndSaveGame').mockResolvedValue([]);

        const res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        } as unknown as Response;

        await controller.validateGameMap(GAME_DATA, res);

        expect(res.status).toHaveBeenCalledWith(HttpStatus.CREATED);
    });

    it('validateGameMap() should return BadRequest if validation fails', async () => {
        jest.spyOn(boardService, 'validateAndSaveGame').mockResolvedValue(['Validation failed']);

        const res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        } as unknown as Response;
        await controller.validateGameMap(GAME_DATA, res);
        expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('editingGame() should succeed if service able to modify the game', async () => {
        boardService.modifyGame.mockResolvedValue([]);

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        } as unknown as Response;

        await controller.editingGame(GAME_DATA, validGameId, res);

        expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);

        expect(res.json).toHaveBeenCalled();
    });

    it('editingGame() should return NotFound if service is not able modify the game', async () => {
        boardService.modifyGame.mockResolvedValue(['Validation failed']);

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.NOT_FOUND);
            return res;
        };
        res.send = () => res;

        await controller.editingGame(new Game(), '', res);
    });

    it('deleteGame() should succeed if service able to delete the game', async () => {
        boardService.deleteGameById.mockResolvedValue(undefined);

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.NO_CONTENT);
            return res;
        };
        res.send = () => res;

        await controller.deleteGame(validGameId, res);
    });

    it('deleteGame() should return NotFound when service cannot delete the game', async () => {
        boardService.deleteGameById.mockRejectedValue(undefined);

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.NOT_FOUND);
            return res;
        };
        res.send = () => res;

        await controller.deleteGame('', res);
    });

    it('updateVisibility() should succeed if service able to update game visibility', async () => {
        boardService.toggleGameVisibility.mockResolvedValue(GAME_DATA);

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.OK);
            return res;
        };
        res.json = (game) => {
            expect(game).toEqual(GAME_DATA);
            return res;
        };

        await controller.updateVisibility(validGameId, res);
    });

    it('updateVisibility() should return InternalServerError if service unable to update game visibility', async () => {
        boardService.toggleGameVisibility.mockRejectedValue(undefined);
        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.INTERNAL_SERVER_ERROR);
            return res;
        };
        res.send = (message) => {
            expect(message).toEqual('Internal server error');
            return res;
        };

        await controller.updateVisibility('', res);
    });

    it('should return InternalServerError if map cannot be retrieved', async () => {
        startGameService.placePlayersOnStartingPoints.mockRejectedValue(new Error('Failed to get game'));

        const res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
        } as unknown as Response;

        await controller.startGame(FAKE_ROOM_ID, res);

        expect(res.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
        expect(res.send).toHaveBeenCalledWith("La carte n'existe plus");
    });

    it('should prevent race conditions when multiple requests arrive', async () => {
        const game = getValidFakeGame('Classic');

        startGameService.placePlayersOnStartingPoints.mockResolvedValue(game);
        startGameService.getTeams.mockReturnValue([]);
        const res1 = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
        } as unknown as Response;

        const res2 = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
        } as unknown as Response;

        await Promise.all([controller.startGame(FAKE_ROOM_ID, res1), controller.startGame(FAKE_ROOM_ID, res2)]);

        expect(startGameService.placePlayersOnStartingPoints).toHaveBeenCalledTimes(1);
        expect(res2.json).toBeCalled();
    });

    const FAKE_ROOM_ID = 'room123';
});
