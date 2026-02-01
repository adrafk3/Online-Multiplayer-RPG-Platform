import { STARTING_POINT1 } from '@app/constants/test-consts';
import { BoardService } from '@app/services/board/board.service';
import { BASE_STAT, MAX_STAT } from '@common/constants';
import { MOCK_PLAYERS } from '@common/constants.spec';
import { VirtualPlayerTypes } from '@common/enums';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Socket } from 'socket.io';
import { GameRoomService } from './game-room.service';

describe('GameRoomService', () => {
    let service: GameRoomService;
    let mockBoardService: Partial<BoardService>;
    let mockLogger: Partial<Logger>;

    beforeEach(async () => {
        mockBoardService = {
            getGameById: jest.fn().mockResolvedValue({ gridSize: 10 }),
        };
        mockLogger = {
            log: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [GameRoomService, { provide: BoardService, useValue: mockBoardService }, { provide: Logger, useValue: mockLogger }],
        }).compile();

        service = module.get<GameRoomService>(GameRoomService);
    });

    const roomId = 'room1';
    const player = MOCK_PLAYERS[0];

    function setupRoom(players = [], selectedAvatars = new Map(), isLocked = false) {
        service.rooms.set(roomId, { players, selectedAvatars, mapId: 'game1', playerMax: 4, playerMin: 1, isLocked });
    }

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createGameRoom', () => {
        it('should create a new game room', async () => {
            const gameId = 'game1';
            const roomIdTest = await service.createGameRoom(gameId);

            expect(roomIdTest).toBeDefined();
            expect(service.rooms.has(roomIdTest)).toBe(true);
        });
    });

    describe('joinGameRoom', () => {
        it('should allow a player to join an existing room', () => {
            setupRoom();
            const result = service.selectAvatar(roomId, player);

            expect(result).toBe(player);
            expect(service.rooms.get(roomId).players).toContain(player);
        });
    });

    describe('selectAvatar', () => {
        beforeEach(() => {
            setupRoom();
        });

        it('should allow a player to select an available avatar', () => {
            service.rooms.get(roomId).playerMax = 1;
            const result = service.selectAvatar(roomId, player);

            expect(result).toBe(player);
            expect(service.rooms.get(roomId).isLocked).toBe(true);
            expect(Array.from(service.rooms.get(roomId).selectedAvatars.values())).toContain(player.avatar);
        });

        it('should not allow selecting an already chosen avatar', () => {
            const roles = new Map<string, string>([[player.id, 'Archer']]);
            setupRoom([player], roles);
            const result = service.selectAvatar(roomId, player);

            expect(result).toBe(false);
        });
    });

    describe('kickPlayer', () => {
        it('should remove a player from the room', () => {
            const roles = new Map<string, string>([[player.id, player.avatar]]);
            setupRoom([player], roles);

            const result = service.kickPlayer(roomId, player.id);

            expect(result).toBe(true);
            expect(service.rooms.get(roomId).players).not.toContain(player);
        });

        it('should return false when trying to kick a non-existent player', () => {
            setupRoom();

            const result = service.kickPlayer(roomId, 'nonExistentPlayer');

            expect(result).toBe(false);
        });
    });

    describe('addVirtualPlayer', () => {
        it('should add a virtual player to the room', () => {
            setupRoom();
            service.rooms.get(roomId).playerMax = 1;

            const virtualPlayer = service.addVirtualPlayer(roomId, VirtualPlayerTypes.Defensive);

            expect(virtualPlayer).toBeDefined();
            expect(service.rooms.get(roomId).isLocked).toBe(true);
            expect(service.rooms.get(roomId).players).toContain(virtualPlayer);
        });
    });

    describe('isLocked', () => {
        it('should return the locked status of a room', () => {
            setupRoom([], new Map(), true);

            const result = service.isLocked(roomId);

            expect(result).toBe(true);
        });
    });

    describe('toggleLock', () => {
        it('should toggle the lock status of a room', () => {
            setupRoom();

            const result = service.toggleLock(roomId);

            expect(result).toBe(true);
            expect(service.rooms.get(roomId).isLocked).toBe(true);
        });
    });

    describe('hasRoom', () => {
        it('should return true for an existing room', () => {
            setupRoom();

            const result = service.hasRoom(roomId);

            expect(result).toBe(true);
        });

        it('should return false for a non-existent room', () => {
            const result = service.hasRoom('nonExistentRoom');

            expect(result).toBe(false);
        });
    });

    describe('removeClientFromRooms', () => {
        it('should remove a client from room', () => {
            player.isHost = false;
            const client2 = { id: 'client2' } as Socket;
            const player2 = { id: client2.id, name: 'Player 2', avatar: 'avatar2', isHost: true };
            const roles = new Map<string, string>([[player.id, player.avatar]]);
            setupRoom([player, player2], roles);

            expect(service.removeClientFromRooms({ id: player.id } as Socket, true)).toEqual({ isHost: false, roomId });
            expect(service.removeClientFromRooms({ id: player.id } as Socket, true)).toEqual({ isHost: undefined, roomId: undefined });
        });

        it('should return correct host status when removing a client', () => {
            const client = { id: 'player1' } as Socket;
            const mockPlayer = { id: 'player1', name: 'Player1', avatar: 'avatar1', isHost: true };
            const roles = new Map<string, string>([[mockPlayer.id, mockPlayer.avatar]]);
            setupRoom([mockPlayer], roles);

            const result = service.removeClientFromRooms(client, true);

            expect(result).toEqual({ isHost: true, roomId });
        });

        it('should return isHost false when client has avatar but is not in players array', () => {
            const clientId = 'client1';
            const selectedAvatars = new Map([[clientId, 'avatar1']]);
            setupRoom([], selectedAvatars);

            const result = service.removeClientFromRooms({ id: clientId } as Socket, true);

            expect(result).toEqual({ isHost: false, roomId });
            expect(service.rooms.get(roomId).selectedAvatars.has(clientId)).toBe(false);
        });
    });

    describe('helper functions', () => {
        beforeEach(() => {
            const roles = new Map<string, string>([[player.id, 'hello']]);
            setupRoom([player], roles);
        });

        it('should return selectedAvatars', () => {
            expect(Array.from(service.getSelectedAvatars(roomId).values())).toEqual(['hello']);
        });

        it('should delete room', () => {
            service.removeRoom(roomId);
            expect(service.hasRoom(roomId)).toBe(false);
        });

        it('should add suffix if player name already exists', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((service as any).generateUniqueName(player.name, service.rooms.get(roomId))).toEqual('Player 1-2');
        });

        it('should generate random stats', () => {
            jest.spyOn(Math, 'random').mockReturnValue(0);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let stats = (service as any).generateRandomStats();
            expect(stats).toEqual({
                life: BASE_STAT,
                speed: MAX_STAT,
                attack: BASE_STAT,
                defense: MAX_STAT,
                maxSpeed: MAX_STAT,
                maxLife: BASE_STAT,
            });
            jest.spyOn(Math, 'random').mockReturnValue(1);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            stats = (service as any).generateRandomStats();
            expect(stats).toEqual({
                life: MAX_STAT,
                speed: BASE_STAT,
                attack: MAX_STAT,
                defense: BASE_STAT,
                maxSpeed: BASE_STAT,
                maxLife: MAX_STAT,
            });
            jest.spyOn(Math, 'random').mockRestore();
        });

        it('should return players', () => {
            expect(service.getPlayers(roomId)).toEqual([player]);
        });
    });

    it('should set starting point for the player and update position', () => {
        setupRoom(MOCK_PLAYERS);

        service.setStartingPoints(roomId, STARTING_POINT1, MOCK_PLAYERS[0]);

        const updatedRoom = service.rooms.get(roomId);
        const updatedPlayer = updatedRoom.players.find((p) => p.id === MOCK_PLAYERS[0].id);

        expect(updatedPlayer).toBeDefined();
        expect(updatedPlayer.startingPoint).toEqual(STARTING_POINT1);
        expect(updatedPlayer.position).toEqual(STARTING_POINT1);
    });

    describe('updateAvatar', () => {
        it('should update the avatar for the specified client', () => {
            const clientId = 'client1';
            const initialAvatar = 'avatar1';
            const newAvatar = 'avatar2';
            const players = [{ id: clientId, name: 'Player 1', avatar: initialAvatar }];
            const selectedAvatars = new Map([[clientId, initialAvatar]]);
            setupRoom(players, selectedAvatars);

            const payload = { roomId, nextAvatar: newAvatar };
            service.updateAvatar(payload, clientId);

            const updatedRoom = service.rooms.get(roomId);
            expect(updatedRoom.selectedAvatars.get(clientId)).toBe(newAvatar);
        });

        it('should update avatars for all players in the room', () => {
            const client1 = { id: 'client1', name: 'Player 1', avatar: 'avatar1' };
            const client2 = { id: 'client2', name: 'Player 2', avatar: 'avatar2' };
            const players = [client1, client2];
            const selectedAvatars = new Map();
            setupRoom(players, selectedAvatars);

            const payload = { roomId, nextAvatar: 'newAvatar' };
            service.updateAvatar(payload, 'client1');

            const updatedRoom = service.rooms.get(roomId);
            expect(updatedRoom.selectedAvatars.get('client1')).toBe('newAvatar');
            expect(updatedRoom.selectedAvatars.get('client2')).toBe('avatar2');
        });

        it('should do nothing if room does not exist', () => {
            const payload = { roomId: 'nonExistentRoom', nextAvatar: 'newAvatar' };
            expect(() => service.updateAvatar(payload, 'client1')).not.toThrow();
        });
    });
});
