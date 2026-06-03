import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { CoreEventsService } from './core-events.service';

@Module({
  imports: [DatabaseModule], // додаємо про всяк випадок, якщо @Global для Database не підхопився
  providers: [CoreEventsService],
  exports: [CoreEventsService], // <--- ОЦЕЙ РЯДОК КРИТИЧНИЙ! Без нього WebhooksModule не побачить сервіс
})
export class CoreEventsModule { }
