import { Controller, Post, Body, HttpCode, HttpStatus, Query, BadRequestException } from '@nestjs/common';
import { CoreEventsService } from '../../core-events/core-events.service';

@Controller('webhooks/gsp')
export class GspController {
    constructor(private readonly coreEventsService: CoreEventsService) { }

    @Post(':provider')
    @HttpCode(HttpStatus.OK)
    async handleGspCallback(
        @Query('brandId') brandId: string,
        @Body() payload: any,
    ) {
        if (!brandId) {
            throw new BadRequestException('Missing brandId query parameter');
        }

        // Симулюємо формат ігрового провайдера (наприклад, Pragmatic Play або Evolution)
        // У них унікальний ID події/раунду часто лежить у round_id або transaction_id
        const eventId = payload?.transaction_id || payload?.round_id;
        const eventType = payload?.action || payload?.event; // наприклад, 'round.bet' або 'round.win'

        if (!eventId || !eventType) {
            throw new BadRequestException('Invalid GSP webhook payload structure: missing transaction_id/round_id or action');
        }

        // Передаємо у наш універсальний сервіс, але вказуємо provider: 'gsp_game'
        const result = await this.coreEventsService.handleWebhookEvent({
            brandId,
            provider: 'gsp_game',
            eventId,
            eventType,
            payload,
        });

        return {
            status: 'accepted',
            idempotency: result.status,
        };
    }
}
