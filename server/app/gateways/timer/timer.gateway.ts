import { TimerService } from '@app/services/time/time.service';
import { TimerEvents } from '@common/gateway-events';
import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TimerInfo } from '@common/interfaces';

@WebSocketGateway({ cors: true })
export class TimerGateway {
    @WebSocketServer()
    server: Server;

    constructor(private timerService: TimerService) {}

    @SubscribeMessage(TimerEvents.StartTimer)
    handleStartTimer(client: Socket, data: TimerInfo) {
        this.timerService.startTimer(data, this.server);
    }

    @SubscribeMessage(TimerEvents.StopTimer)
    handleStopTimer(client: Socket, data: TimerInfo) {
        this.timerService.stopTimer(data);
    }

    @SubscribeMessage(TimerEvents.ResetTimer)
    handleResetTimer(client: Socket, data: TimerInfo) {
        this.timerService.resetTimer(data, this.server);
    }
}
