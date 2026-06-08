import { Controller, Post, Body, HttpCode, HttpStatus, Query, BadRequestException } from '@nestjs/common';
import { CoreEventsService } from '../../core-events/core-events.service';

@Controller('webhooks/psp')
export class PspController {
  constructor(private readonly coreEventsService: CoreEventsService) {}

  @Post(':provider')
  @HttpCode(HttpStatus.OK) // Для вебхуків завжди повертаємо 200/204
  async handlePspCallback(
    @Query('brandId') brandId: string, // Передаємо тенант через query string: ?brandId=brandA
    @Body() payload: any,
  ) {
    if (!brandId) {
      throw new BadRequestException('Missing brandId query parameter');
    }

    // Специфічний парсинг для Stripe форматів
    const eventId = payload?.id; // наприклад, 'evt_1Oxi23...'
    const eventType = payload?.type; // наприклад, 'charge.succeeded'

    if (!eventId || !eventType) {
      throw new BadRequestException('Invalid webhook payload structure: missing id or type');
    }

    // Передаємо на безпечне збереження в CoreEvents
    const result = await this.coreEventsService.handleWebhookEvent({
      brand_id: brandId,
      provider: 'stripe',
      event_id: eventId,
      event_type: eventType,
      user_id: payload?.data?.object?.customer, // Якщо є можливість, передаємо user_id для аналітики
      amount: payload?.data?.object?.amount, // Якщо є можливість, передаємо суму для аналітики
      currency: payload?.data?.object?.currency, // Якщо є можливість, передаємо валюту для аналітики
      idempotency_key: payload?.id, // Використовуємо eventId як idempotencyKey для Stripe
      status: 'success',
      payload,
    });

    return {
      received: true,
      idempotency: result.status,
    };
  }
}