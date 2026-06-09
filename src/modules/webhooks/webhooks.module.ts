import { Module } from '@nestjs/common';
import { CoreEventsModule } from '../core-events/core-events.module';
import { PspController } from './psp/psp.controller';
import { GspController } from './gsp/gsp.controller';
import { WebhooksService } from './webhooks.service';
import { StripeAdapter } from './adapters/stripe.adapter';
import { GspAdapter } from './adapters/gsp.adapter';
import { WebhookParserFactory } from './webhook-parser.factory';

@Module({
  imports: [CoreEventsModule],
  controllers: [PspController, GspController],
  providers: [WebhooksService, StripeAdapter, GspAdapter, WebhookParserFactory],
  exports: [StripeAdapter, GspAdapter, WebhookParserFactory],
})
export class WebhooksModule {}
