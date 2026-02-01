import { GameRoomService } from '@app/services/game-room/game-room.service';
import { Player } from '@common/interfaces';
import { HttpException, Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GameRoomController } from './game-room.controller';

describe('GameRoomController', () => {
    let controller: GameRoomController;
    let gameRoomService: jest.Mocked<GameRoomService>;
    let logger: jest.Mocked<Logger>;

    beforeEach(async () => {
        const mockGameRoomService = {
            createGameRoom: jest.fn(),
            hasRoom: jest.fn(),
            isLocked: jest.fn(),
            selectAvatar: jest.fn(),
            getPlayers: jest.fn(),
        };

        const mockLogger = {
            log: jest.fn().mockReturnValue(undefined),
            error: jest.fn().mockReturnValue(undefined),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [GameRoomController],
            providers: [
                { provide: GameRoomService, useValue: mockGameRoomService },
                { provide: Logger, useValue: mockLogger },
            ],
        }).compile();

        controller = module.get<GameRoomController>(GameRoomController);
        gameRoomService = module.get(GameRoomService);
        logger = module.get(Logger);
    });

    const roomId = 'room1';

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('createRoom', () => {
        it('should create a room successfully', async () => {
            const gameId = 'game123';
            gameRoomService.createGameRoom.mockResolvedValue(roomId);

            const result = await controller.createRoom(gameId);

            expect(result).toEqual({ roomId });
            expect(logger.log).toHaveBeenCalledWith(`New room created: ${roomId} for game ${gameId}`);
        });

        it('should throw an exception when room creation fails', async () => {
            const gameId = 'game123';
            gameRoomService.createGameRoom.mockRejectedValue(new Error('Creation failed'));

            await expect(controller.createRoom(gameId)).rejects.toThrow(HttpException);
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe('validateCode', () => {
        it('should return successfully for an existing and unlocked room', () => {
            gameRoomService.hasRoom.mockReturnValue(true);
            gameRoomService.isLocked.mockReturnValue(false);

            expect(() => controller.validateCode(roomId)).not.toThrow();
        });
        it('should throw an exception for a locked room', () => {
            gameRoomService.hasRoom.mockReturnValue(true);
            gameRoomService.isLocked.mockReturnValue(true);

            expect(() => controller.validateCode(roomId)).toThrow(HttpException);
        });

        it('should throw an exception for a non-existent room', () => {
            gameRoomService.hasRoom.mockReturnValue(false);

            expect(() => controller.validateCode(roomId)).toThrow(HttpException);
        });
    });

    describe('selectAvatar', () => {
        it('should select an avatar successfully', () => {
            const payload = { roomId: 'room123', player: { id: 'player1' } as Player };
            const updatedPlayer = { ...payload.player, avatar: 'avatar1' };
            gameRoomService.selectAvatar.mockReturnValue(updatedPlayer);

            const result = controller.selectAvatar(payload);

            expect(result).toEqual({ player: updatedPlayer });
        });

        it('should throw an exception when avatar selection fails', () => {
            const payload = { roomId: 'room123', player: { id: 'player1' } as Player };
            gameRoomService.selectAvatar.mockReturnValue(null);

            expect(() => controller.selectAvatar(payload)).toThrow(HttpException);
        });
    });
    describe('getPlayers', () => {
        it('should return players successfully', () => {
            const players = [
                { id: 'player1', name: 'Player 1', avatar: 'avatar1', isHost: false },
                { id: 'player2', name: 'Player 2', avatar: 'avatar2', isHost: false },
            ];
            gameRoomService.getPlayers.mockReturnValue(players);

            const result = controller.getPlayers(roomId);

            expect(result).toEqual(players);
        });

        it('should throw an exception when players are not found', () => {
            const errorMessage = 'Players not found';
            gameRoomService.getPlayers.mockImplementation(() => {
                throw new Error(errorMessage);
            });

            expect(() => controller.getPlayers(roomId)).toThrow(HttpException);
        });
    });
});
