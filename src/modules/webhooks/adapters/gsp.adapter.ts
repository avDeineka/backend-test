import { Injectable, BadRequestException } from '@nestjs/common';
import { WebhookAdapter } from '../interfaces/webhook-adapter.interface';
import { RawEvent } from '../../../shared/database/interfaces/raw-event.interface';

@Injectable()
export class GspAdapter implements WebhookAdapter {
  supports(provider: string): boolean {
    // Підтримуємо будь-яких ігрових провайдерів (pragmatic, evolution тощо) через цей адаптер
    return ['gsp_game', 'pragmatic', 'evolution'].includes(provider.toLowerCase());
  }

  normalize(brandId: string, provider: string, payload: any): RawEvent {
    const eventId = payload?.transaction_id || payload?.round_id;
    const eventType = payload?.action || payload?.event;

    if (!eventId || !eventType) {
      throw new BadRequestException('Invalid GSP payload structure');
    }

    return {
      brand_id: brandId,
      provider: provider,
      event_id: eventId,
      event_type: eventType,
      user_id: payload?.user_id || null, // Очікуємо UUID від гри
      amount: payload?.amount !== undefined ? Number(payload.amount) : null,
      currency: payload?.currency?.toUpperCase() || null,
      idempotency_key: payload?.transaction_id || eventId,
      status: 'success',
      payload,
    };
  }
}
