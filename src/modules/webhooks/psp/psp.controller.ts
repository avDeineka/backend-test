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
      brandId,
      provider: 'stripe',
      eventId,
      eventType,
      payload,
    });

    return {
      received: true,
      idempotency: result.status,
    };
  }
}