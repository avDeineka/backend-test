import { Injectable, ConflictException, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../../shared/database/database.service';

@Injectable()
export class CoreEventsService {
  constructor(private readonly dbService: DatabaseService) {}

  private get db() {
    return this.dbService.db;
  }

  async handleWebhookEvent(params: {
    brandId: string;
    provider: string;
    eventId: string; // Це унікальний ID події від провайдера (Stripe), який служить ключем ідемпотентності
    eventType: string;
    payload: any;
  }) {
    const { brandId, provider, eventId, eventType, payload } = params;

    // 1. ПЕРЕВІРКА ІДЕМПОТЕНТНОСТІ
    // Шукаємо ключ у межах конкретного бренду
    const existingKey = await this.db('idempotency_keys')
      .where({ brand_id: brandId, idempotency_key: eventId })
      .first();

    if (existingKey) {
      if (existingKey.status === 'completed') {
        // Якщо подія вже успішно оброблена раніше — просто повертаємо той самий статус, що й тоді
        // Це стандарт для Stripe: дублікати ігноруються, але їм повертається 200 OK
        return {
          status: 'duplicated',
          action: 'ignored',
          previousResponseCode: existingKey.response_code,
        };
      }
      
      if (existingKey.status === 'processing') {
        // Якщо запит ще крутиться паралельно в іншому потоці
        throw new HttpException('Event is already being processed', HttpStatus.LOCKED);
      }
    }

    // 2. ЗАПУСК ТРАНЗАКЦІЇ (Outbox Pattern)
    // Використовуємо Knex Transaction для гарантії атомарності
    await this.db.transaction(async (trx) => {
      // Крок А: Створюємо/оновлюємо запис ідемпотентності всередині транзакції
      if (existingKey) {
         await trx('idempotency_keys')
          .where({ brand_id: brandId, idempotency_key: eventId })
          .update({ status: 'processing', updated_at: new Date() });
      } else {
        await trx('idempotency_keys').insert({
          idempotency_key: eventId,
          brand_id: brandId,
          status: 'processing',
        });
      }

      // Крок Б: Зберігаємо сиру подію в raw_events
      await trx('raw_events').insert({
        brand_id: brandId,
        provider: provider,
        event_type: eventType,
        external_event_id: eventId,
        payload: JSON.stringify(payload), // зберігаємо як JSONB
        status: 'pending',
      });

      // Крок В: Оновлюємо статус ідемпотентності на завершений
      await trx('idempotency_keys')
        .where({ brand_id: brandId, idempotency_key: eventId })
        .update({
          status: 'completed',
          response_code: HttpStatus.OK,
          updated_at: new Date(),
        });
    });

    return { status: 'success', action: 'persisted' };
  }
}
