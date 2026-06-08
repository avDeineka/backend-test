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
            brand_id: brandId,
            provider: 'gsp_game',
            event_id: eventId,
            event_type: eventType,
            user_id: payload?.user_id, // Якщо є можливість, передаємо user_id для аналітики
            amount: payload?.amount, // Якщо є можливість, передаємо суму для аналітики
            currency: payload?.currency, // Якщо є можливість, передаємо валюту для аналітики
            idempotency_key: payload?.transaction_id, // Якщо є можливість, передаємо idempotency_key для аналітики
            status: 'success',
            payload,
        });

        return {
            status: 'accepted',
            idempotency: result.status,
        };
    }
}
