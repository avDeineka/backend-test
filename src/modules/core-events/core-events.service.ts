import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../../shared/database/database.service';
import { RawEvent } from '../../shared/database/interfaces/raw-event.interface';

@Injectable()
export class CoreEventsService {
  constructor(private readonly dbService: DatabaseService) { }

  private get db() {
    return this.dbService.db;
  }

  async handleWebhookEvent(params: RawEvent) {
    const { brand_id, provider, event_id, event_type, user_id, amount, currency, idempotency_key, payload } = params;

    // 1. ПЕРЕВІРКА ІДЕМПОТЕНТНОСТІ
    const existingKey = await this.db('idempotency_keys')
      .where({ brand_id, idempotency_key: event_id })
      .first();

    if (existingKey) {
      if (existingKey.status === 'completed') {
        return {
          status: 'duplicated',
          action: 'ignored',
          previousResponseCode: existingKey.response_code,
        };
      }

      if (existingKey.status === 'processing') {
        throw new HttpException('Event is already being processed', HttpStatus.LOCKED);
      }
    }

    // 2. ЗАПУСК ТРАНЗАКЦІЇ
    await this.db.transaction(async (trx) => {
      if (existingKey) {
        await trx('idempotency_keys')
          .where({ brand_id, idempotency_key: event_id })
          .update({ status: 'processing', updated_at: new Date() });
      } else {
        await trx('idempotency_keys').insert({
          idempotency_key: event_id,
          brand_id,
          status: 'processing',
        });
      }

      // Крок Б: Зберігаємо подію з ТИПІЗАЦІЄЮ через інтерфейс
      const rawEventData: RawEvent = {
        brand_id: brand_id,
        provider: provider,
        event_id: event_id,
        event_type: event_type,
        user_id: user_id || null,
        amount: amount || null,
        currency: currency || null,
        idempotency_key: idempotency_key || null,
        payload: payload,
        status: 'success',
      };

      await trx<RawEvent>('raw_events').insert(rawEventData);

      // Крок В: Оновлюємо статус ідемпотентності
      await trx('idempotency_keys')
        .where({ brand_id, idempotency_key: event_id })
        .update({
          status: 'completed',
          response_code: HttpStatus.OK,
          updated_at: new Date(),
        });
    });

    return { status: 'success', action: 'persisted' };
  }
}
