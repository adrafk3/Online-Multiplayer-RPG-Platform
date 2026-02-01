import { BoardService } from '@app/services/board/board.service';
import { AVATARS } from '@common/avatar';
import { BASE_STAT, DIGIT_MULTIPLIER, HALF_PERCENTAGE, ID_LENGTH, MAX_PLAYER, MAX_STAT, MIN_PLAYER } from '@common/constants';
import { VirtualPlayerTypes } from '@common/enums';
import { AvatarUpdate, Player, PlayerDisconnect, RoomData, Stats } from '@common/interfaces';
import { Position } from '@common/types';
import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GameRoomService {
    private _rooms: Map<string, RoomData> = new Map();
    private virtualPlayerNames = ['Nicolas', 'Maxime', 'Victor', 'Lucas', 'Olivier', 'Simon', 'Pedro'];

    constructor(private gameService: BoardService) {}
    get rooms() {
        return this._rooms;
    }

    getPlayers(roomId: string): Player[] {
        const room = this._rooms.get(roomId);
        return room.players;
    }

    setStartingPoints(roomId: string, startingPoint: Position, player: Player): void {
        const room = this._rooms.get(roomId);
        const playerIndex = room.players.findIndex((p) => p.id === player.id);
        room.players[playerIndex].startingPoint = startingPoint;
        room.players[playerIndex].position = startingPoint;
    }

    async createGameRoom(gameId: string): Promise<string> {
        const size = (await this.gameService.getGameById(gameId)).gridSize;
        const roomId = this.generateUniqueRoomId();
        this._rooms.set(roomId, {
            players: [],
            selectedAvatars: new Map<string, string>(),
            mapId: gameId,
            playerMax: MAX_PLAYER.get(size),
            playerMin: MIN_PLAYER,
            isLocked: false,
            currentTurn: null,
            messages: [],
            logs: [],
        });
        return roomId;
    }
    selectAvatar(roomId: string, player: Player) {
        const room = this._rooms.get(roomId);
        if (!this.isAvatarAvailable(room.players, player.avatar)) return false;
        player.victories = 0;
        player.name = this.generateUniqueName(player.name, room);
        player.stats.maxSpeed = player.stats.speed;
        player.stats.maxLife = player.stats.life;
        room.selectedAvatars.set(player.id, player.avatar);
        room.players.push(player);

        if (room.players.length >= room.playerMax) {
            room.isLocked = true;
        }
        return player;
    }
    kickPlayer(roomId: string, playerId: string): boolean {
        const room = this._rooms.get(roomId);
        const playerIndex = room.players.findIndex((playerToKick) => playerToKick.id === playerId);
        if (playerIndex === -1) return false;
        room.players.splice(playerIndex, 1);
        room.selectedAvatars.delete(playerId);
        room.isLocked = false;
        return true;
    }
    addVirtualPlayer(roomId: string, type: VirtualPlayerTypes): Player {
        const room = this._rooms.get(roomId);
        const virtualPlayerName = this.generateUniqueVirtualPlayerName(room);
        const virtualPlayer: Player = {
            id: `virtual-${uuidv4()}`,
            isHost: false,
            name: virtualPlayerName,
            avatar: this.getRandomAvailableAvatar(room),
            type,
            stats: this.generateRandomStats(),
            victories: 0,
            inventory: [],
        };
        room.players.push(virtualPlayer);
        room.selectedAvatars.set(virtualPlayer.id, virtualPlayer.avatar);

        if (room.players.length === room.playerMax) {
            room.isLocked = true;
        }

        return virtualPlayer;
    }
    getSelectedAvatars(roomId: string) {
        return this._rooms.get(roomId).selectedAvatars;
    }
    isLocked(roomId: string) {
        return this._rooms.get(roomId).isLocked;
    }
    toggleLock(roomId: string) {
        this._rooms.get(roomId).isLocked = !this._rooms.get(roomId).isLocked;
        return this._rooms.get(roomId).isLocked;
    }
    hasRoom(roomId: string) {
        return this._rooms.has(roomId);
    }
    removeRoom(roomId: string) {
        this._rooms.delete(roomId);
    }
    updateAvatar(payload: AvatarUpdate, client: string) {
        const room = this._rooms.get(payload.roomId);
        if (room) {
            room.players.forEach((player) => {
                if (player.avatar) {
                    room.selectedAvatars.set(player.id, player.avatar);
                }
            });
            room.selectedAvatars.set(client, payload.nextAvatar);
        }
    }
    removeClientFromRooms(client: Socket, isGameStarted: boolean): PlayerDisconnect {
        for (const [roomId, room] of this._rooms.entries()) {
            const index = room.players.findIndex((player) => player.id === client.id);
            const hadAvatar = room.selectedAvatars.delete(client.id);
            if (index !== -1) {
                const removedPlayer = room.players.splice(index, 1)[0];
                if (room.players.length === 0 || (removedPlayer.isHost && !isGameStarted)) {
                    this._rooms.delete(roomId);
                    return { isHost: true, roomId };
                } else {
                    return { isHost: false, roomId };
                }
            }
            if (hadAvatar) {
                return { isHost: false, roomId };
            }
        }
        return { isHost: undefined, roomId: undefined };
    }
    private isAvatarAvailable(players: Player[], playerAvatar: string): boolean {
        return !players.some((player) => player.avatar === playerAvatar);
    }
    private generateUniqueRoomId(): string {
        let roomId: string;
        do {
            roomId = Array.from({ length: ID_LENGTH }, () => Math.floor(Math.random() * DIGIT_MULTIPLIER)).join('');
        } while (this._rooms.has(roomId));
        return roomId;
    }
    private generateUniqueName(name: string, room: RoomData): string {
        let uniqueName = name;
        let suffix = 1;

        while (room.players.some((player) => player.name === uniqueName)) {
            suffix++;
            uniqueName = `${name}-${suffix}`;
        }

        return uniqueName;
    }
    private generateUniqueVirtualPlayerName(room: RoomData): string {
        const randomIndex = Math.floor(Math.random() * this.virtualPlayerNames.length);
        const randomName = this.virtualPlayerNames[randomIndex];
        return this.generateUniqueName(randomName, room);
    }
    private getRandomAvailableAvatar(room: RoomData): string | undefined {
        const allAvatars = AVATARS.filter((avatar) => avatar.name !== 'Knuckles').map((avatar) => avatar.name);
        const usedAvatars = new Set(room.selectedAvatars.values());
        const availableAvatars = allAvatars.filter((avatar) => !usedAvatars.has(avatar));

        const randomIndex = Math.floor(Math.random() * availableAvatars.length);
        return availableAvatars[randomIndex];
    }
    private generateRandomStats(): Stats {
        const isLifeFour = Math.random() < HALF_PERCENTAGE;
        const isAttackFour = Math.random() < HALF_PERCENTAGE;
        const stats: Stats = {
            life: isLifeFour ? BASE_STAT : MAX_STAT,
            speed: isLifeFour ? MAX_STAT : BASE_STAT,
            attack: isAttackFour ? BASE_STAT : MAX_STAT,
            defense: isAttackFour ? MAX_STAT : BASE_STAT,
        };
        stats.maxLife = stats.life;
        stats.maxSpeed = stats.speed;
        return stats;
    }
}
