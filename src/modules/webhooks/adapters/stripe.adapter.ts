import { Injectable, BadRequestException } from '@nestjs/common';
import { WebhookAdapter } from '../interfaces/webhook-adapter.interface';
import { RawEvent } from '../../../shared/database/interfaces/raw-event.interface';

@Injectable()
export class StripeAdapter implements WebhookAdapter {
  supports(provider: string): boolean {
    return provider.toLowerCase() === 'stripe';
  }

  normalize(brandId: string, provider: string, payload: any): RawEvent {
    const eventId = payload?.id;
    const eventType = payload?.type;

    if (!eventId || !eventType) {
      throw new BadRequestException('Invalid Stripe payload structure');
    }

    // Stripe передає суми в мінімальних одиницях (центах) як ціле число
    const rawAmount = payload?.data?.object?.amount;
    const amount = rawAmount !== undefined ? rawAmount / 100 : null; 

    return {
      brand_id: brandId,
      provider: provider,
      event_id: eventId,
      event_type: eventType,
      user_id: payload?.data?.object?.customer || null,
      amount: amount,
      currency: payload?.data?.object?.currency?.toUpperCase() || null,
      idempotency_key: payload?.request?.idempotency_key || eventId,
      status: 'success',
      payload,
    };
  }
}