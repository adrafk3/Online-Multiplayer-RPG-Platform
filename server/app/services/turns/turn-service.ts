import { GameRoomService } from '@app/services/game-room/game-room.service';
import { TimerService } from '@app/services/time/time.service';
import { RANDOMIZER } from '@common/constants';
import { ActiveGameEvents, CTFEvents } from '@common/gateway-events';
import { GameDisconnect, Player, RoomData } from '@common/interfaces';
import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { TurnInfo } from '@app/interfaces/turn-service-interfaces';
@Injectable()
export class TurnService {
    constructor(
        private gameRoomService: GameRoomService,
        private timeService: TimerService,
    ) {}
    findRoomFromClient(client: string): string | undefined {
        for (const [roomId, room] of this.gameRoomService.rooms.entries()) {
            const playerIndex = room.players.findIndex((player) => player.id === client);
            if (playerIndex !== -1) {
                return roomId;
            }
        }
        return undefined;
    }

    setFirstTurn(roomId: string, players: Player[]) {
        const room = this.gameRoomService.rooms.get(roomId);
        if (!room) return;

        const sortedPlayers = players.slice().sort((a, b) => {
            if (b.stats?.maxSpeed !== a.stats?.maxSpeed) {
                return b.stats.maxSpeed - a.stats.maxSpeed;
            }
            return Math.random() - RANDOMIZER;
        });

        room.currentTurn = sortedPlayers[0];
        room.players = sortedPlayers;

        return room.currentTurn;
    }

    nextTurn(roomId: string) {
        const room = this.gameRoomService.rooms.get(roomId);

        if (!room || !room.players.length) return;

        const currentTurn = room.currentTurn;
        const playerOrder = room.players;

        if (!currentTurn) return;

        const currentIndex = playerOrder.findIndex((player) => player.id === currentTurn.id);
        const nextIndex = (currentIndex + 1) % playerOrder.length;
        room.currentTurn = playerOrder[nextIndex];
        return room.currentTurn;
    }

    handlePlayerQuit(roomId: string, quittingPlayerId: string, server: Server): boolean | Player {
        const room = this.gameRoomService.rooms.get(roomId);
        if (!room || !room.map) return false;

        const quittingPlayer = room.players.find((player) => player.id === quittingPlayerId);
        room.disconnectedPlayers.push(quittingPlayer);
        if (room.flagHolderId === quittingPlayerId) {
            room.flagHolderId = undefined;
            server.to(roomId).emit(CTFEvents.FlagDropped);
        }
        const noMorePlayers = this.handleNoMorePlayers(room, { server, roomId, quittingPlayerId });
        if (noMorePlayers) return noMorePlayers;
        const combatDisconnect = this.handleCombatDisconnect({ server, roomId, quittingPlayerId }, room, quittingPlayer);
        if (combatDisconnect) return combatDisconnect;
        return this.handleDisconnectEnd(room, { server, roomId, quittingPlayerId }, quittingPlayer);
    }
    private handleNoMorePlayers(room: RoomData, turnInfo: TurnInfo) {
        if (
            room.players.filter((player) => player.id !== turnInfo.quittingPlayerId).length <= 1 ||
            room.players.filter((player) => !player.type && player.id !== turnInfo.quittingPlayerId).length === 0
        ) {
            turnInfo.server.to(turnInfo.roomId).emit(ActiveGameEvents.NoMorePlayers, {
                player: room.players[0],
            });
            this.gameRoomService.rooms.delete(turnInfo.roomId);
            this.timeService.stopTimer({ roomId: turnInfo.roomId });
            return true;
        }
    }
    private handleCombatDisconnect(turnInfo: TurnInfo, room: RoomData, quittingPlayer: Player) {
        if (room.gameState && room.gameState.combat) {
            const combat = room.gameState.combat;
            const winnerId = combat.attacker === turnInfo.quittingPlayerId ? combat.defender : combat.attacker;
            const winningPlayer = room.players.find((player) => player.id === winnerId);
            if (winningPlayer) {
                winningPlayer.playerStats.nVictories++;
                quittingPlayer.playerStats.nDefeats++;
            }
            if (!(combat.attacker === turnInfo.quittingPlayerId || combat.defender === turnInfo.quittingPlayerId)) {
                turnInfo.server.to(turnInfo.roomId).emit(ActiveGameEvents.PlayerDisconnect, {
                    playerId: turnInfo.quittingPlayerId,
                    remainingPlayers: room.players.filter((player) => player.id !== turnInfo.quittingPlayerId),
                    itemInformation: { inventory: quittingPlayer.inventory, position: quittingPlayer.position },
                } as GameDisconnect);
                return true;
            } else if (winningPlayer.type) this.nextTurn(turnInfo.roomId);
        }
    }
    private handleDisconnectEnd(room: RoomData, turnInfo: TurnInfo, quittingPlayer: Player) {
        let nextTurn: Player;
        if (room.currentTurn?.id === turnInfo.quittingPlayerId) {
            nextTurn = this.nextTurn(turnInfo.roomId);
        }
        turnInfo.server.to(turnInfo.roomId).emit(ActiveGameEvents.TurnUpdate, { player: room.currentTurn });
        turnInfo.server.to(turnInfo.roomId).emit(ActiveGameEvents.PlayerDisconnect, {
            roomId: turnInfo.roomId,
            playerId: turnInfo.quittingPlayerId,
            remainingPlayers: room.players.filter((player) => player.id !== turnInfo.quittingPlayerId),
            itemInformation: { inventory: quittingPlayer.inventory ?? [], position: quittingPlayer.position },
        });

        return nextTurn ? nextTurn : true;
    }
}
