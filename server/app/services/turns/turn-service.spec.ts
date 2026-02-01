import { GameRoomService } from '@app/services/game-room/game-room.service';
import { TimerService } from '@app/services/time/time.service';
import { TurnService } from '@app/services/turns/turn-service';
import { MOCK_PLAYERS, MOCK_ROOM, RANDOM_FRACTION2 } from '@common/constants.spec';
import { ActiveGameEvents } from '@common/gateway-events';
import { GameState, Player, RoomData } from '@common/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'socket.io';

describe('TurnService', () => {
    let turnService: TurnService;
    let server: Server;
    let roomsMap: Map<string, RoomData>;
    const roomId = 'room1';
    let room: RoomData;

    beforeEach(async () => {
        roomsMap = new Map<string, RoomData>();

        const gameRoomServiceMock = {
            rooms: roomsMap,
        };

        const timerServiceMock = {
            stopTimer: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TurnService,
                { provide: GameRoomService, useValue: gameRoomServiceMock },
                { provide: TimerService, useValue: timerServiceMock },
            ],
        }).compile();

        turnService = module.get<TurnService>(TurnService);

        server = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        } as unknown as Server;

        roomsMap.set(roomId, { ...MOCK_ROOM });

        room = roomsMap.get(roomId);
    });

    it('should be defined', () => {
        expect(turnService).toBeDefined();
    });

    describe('findRoomFromClient', () => {
        it('should return roomId if client exists', () => {
            const playerId = MOCK_PLAYERS[0].id;

            const result = turnService.findRoomFromClient(playerId);

            expect(result).toBe(roomId);
        });

        it('should return undefined if client does not exist', () => {
            const result = turnService.findRoomFromClient('nonExistentPlayer');

            expect(result).toBeUndefined();
        });
    });

    describe('nextTurn', () => {
        it('should change the turn to the next player', () => {
            const player1: Player = MOCK_PLAYERS[0];
            const player2: Player = MOCK_PLAYERS[1];
            room.players = [player1, player2];
            room.currentTurn = player1;
            roomsMap.set(roomId, room);

            const result = turnService.nextTurn(roomId);

            expect(result).toBe(player2);
            expect(room.currentTurn).toBe(player2);
        });

        it('should loop to the first player if the last player finishes their turn', () => {
            room.players = [MOCK_PLAYERS[0], MOCK_PLAYERS[1]];
            room.currentTurn = MOCK_PLAYERS[1];

            roomsMap.set(roomId, room);

            const result = turnService.nextTurn(roomId);

            expect(result).toBe(MOCK_PLAYERS[0]);
            expect(room.currentTurn).toBe(MOCK_PLAYERS[0]);
        });

        it('should return undefined if room does not exist', () => {
            const result = turnService.nextTurn('nonExistentRoom');

            expect(result).toBeUndefined();
        });

        it('should return undefined if no current turn is set', () => {
            room.players = [...MOCK_PLAYERS];
            room.currentTurn = null;

            roomsMap.set(roomId, room);

            const result = turnService.nextTurn(roomId);

            expect(result).toBeUndefined();
        });
    });

    describe('handlePlayerQuit', () => {
        beforeEach(() => {
            room.gameState = {
                players: MOCK_PLAYERS,
                combat: { attacker: MOCK_PLAYERS[0].id, defender: MOCK_PLAYERS[1].id },
            } as unknown as GameState;
            room.players = MOCK_PLAYERS;
            room.currentTurn = MOCK_PLAYERS[0];
            room.flagHolderId = MOCK_PLAYERS[0].id;
            turnService.setFirstTurn('nonExistentRoom', MOCK_PLAYERS);
        });

        it('should remove player from the room and emit events', () => {
            room.gameState = undefined;
            room.players = MOCK_PLAYERS;
            room.currentTurn = MOCK_PLAYERS[0];

            roomsMap.set(roomId, room);

            const result = turnService.handlePlayerQuit(roomId, MOCK_PLAYERS[2].id, server);

            expect(result).toBeTruthy();
            expect(room.players[0]).toBe(MOCK_PLAYERS[0]);
            expect(server.to).toHaveBeenCalledWith(roomId);
            expect(server.emit).toHaveBeenCalled();
            expect(server.emit).toHaveBeenCalled();
        });

        it('should return false if the roomId does not exist', () => {
            roomsMap.delete('room1');
            const result = turnService.handlePlayerQuit('room1', MOCK_PLAYERS[0].id, server);
            expect(result).toBe(false);
        });

        it('should delete the room and emit NoMorePlayers if only 1 player remains', () => {
            room.players = [MOCK_PLAYERS[0], MOCK_PLAYERS[1]];
            room.currentTurn = MOCK_PLAYERS[0];

            roomsMap.set(roomId, room);

            turnService.handlePlayerQuit(roomId, MOCK_PLAYERS[1].id, server);

            expect(roomsMap.has(roomId)).toBeFalsy();
            expect(server.to).toHaveBeenCalledWith(roomId);
            expect(server.emit).toHaveBeenCalledWith(ActiveGameEvents.NoMorePlayers, {
                player: MOCK_PLAYERS[0],
            });
        });

        it('should not trigger next turn if the currentTurn id does not exist', () => {
            room.players = MOCK_PLAYERS;
            room.currentTurn = undefined;

            roomsMap.set(roomId, room);

            const nextTurnSpy = jest.spyOn(turnService, 'nextTurn');

            turnService.handlePlayerQuit(roomId, MOCK_PLAYERS[0].id, server);

            expect(nextTurnSpy).not.toHaveBeenCalled();
        });

        it('should trigger next turn if the quitting player was the current player', () => {
            room.players = MOCK_PLAYERS;
            room.currentTurn = MOCK_PLAYERS[0];

            roomsMap.set(roomId, room);

            const nextTurnSpy = jest.spyOn(turnService, 'nextTurn');

            turnService.handlePlayerQuit(roomId, MOCK_PLAYERS[0].id, server);

            expect(nextTurnSpy).toHaveBeenCalledWith(roomId);
            expect(server.to).toHaveBeenCalledWith(roomId);
            expect(server.emit).toHaveBeenCalledWith(ActiveGameEvents.TurnUpdate, { player: room.currentTurn });
        });

        it("should emit an empty inventory if the attribute doesn't exist on the player", () => {
            MOCK_PLAYERS[0].inventory = undefined;
            turnService.handlePlayerQuit(roomId, MOCK_PLAYERS[0].id, server);

            expect(server.emit).toHaveBeenCalledWith(ActiveGameEvents.TurnUpdate, { player: room.currentTurn });
            expect(server.emit).toHaveBeenCalled();
        });

        it('should do nothing if room does not exist', () => {
            turnService.handlePlayerQuit('nonExistentRoom', MOCK_PLAYERS[0].id, server);

            expect(server.to).not.toHaveBeenCalled();
            expect(server.emit).not.toHaveBeenCalled();
        });

        it('should return true if the game is in combat state', () => {
            const result = turnService.handlePlayerQuit(roomId, MOCK_PLAYERS[2].id, server);

            expect(result).toBeTruthy();
            expect(server.to).toHaveBeenCalledWith(roomId);
            expect(server.emit).toHaveBeenCalled();
        });

        it('should return undefined if room does not exist', () => {
            const result = turnService.setFirstTurn('nonExistentRoom', MOCK_PLAYERS);

            expect(result).toBeUndefined();
        });

        it('should change the winnerId if a player quits', () => {
            const victories = MOCK_PLAYERS[0].playerStats.nVictories + 1;
            turnService.handlePlayerQuit(roomId, MOCK_PLAYERS[1].id, server);
            expect(MOCK_PLAYERS[0].playerStats.nVictories).toEqual(victories);
        });

        it('should change the winnerId if a player quits', () => {
            const victories = MOCK_PLAYERS[1].playerStats.nVictories + 1;
            turnService.handlePlayerQuit(roomId, MOCK_PLAYERS[0].id, server);
            expect(MOCK_PLAYERS[0].playerStats.nVictories).toEqual(victories);
        });
    });

    describe('setFirstTurn', () => {
        const originalMathRandom = Math.random;

        afterEach(() => {
            Math.random = originalMathRandom;
        });

        const setupRoomWithPlayers = (players: Player[]) => {
            room.players = players;
            roomsMap.set(roomId, room);
        };

        const assertFirstTurn = (players: Player[], expectedPlayer: Player) => {
            const result = turnService.setFirstTurn(roomId, players);

            expect(result).toBe(expectedPlayer);
            expect(room.currentTurn).toBe(expectedPlayer);
            expect(room.players[0]).toBe(expectedPlayer);
        };

        it('should set the first player based on maxSpeed when both players have stats and different maxSpeed', () => {
            const players = [
                { ...MOCK_PLAYERS[0], stats: { ...MOCK_PLAYERS[0].stats, maxSpeed: 10 } },
                { ...MOCK_PLAYERS[1], stats: { ...MOCK_PLAYERS[1].stats, maxSpeed: 20 } },
            ];

            setupRoomWithPlayers(players);
            assertFirstTurn(players, players[1]);
        });

        it('should set the first player randomly when both players have stats and same maxSpeed', () => {
            const players = [
                { ...MOCK_PLAYERS[0], stats: { ...MOCK_PLAYERS[0].stats, maxSpeed: 10 } },
                { ...MOCK_PLAYERS[1], stats: { ...MOCK_PLAYERS[1].stats, maxSpeed: 10 } },
            ];

            setupRoomWithPlayers(players);
            Math.random = () => RANDOM_FRACTION2;

            assertFirstTurn(players, players[0]);
        });

        it('should set the first player randomly when both players do not have stats', () => {
            const players = [
                { ...MOCK_PLAYERS[0], stats: undefined },
                { ...MOCK_PLAYERS[1], stats: undefined },
            ];

            setupRoomWithPlayers(players);
            Math.random = () => RANDOM_FRACTION2;

            assertFirstTurn(players, players[0]);
        });
    });
});
