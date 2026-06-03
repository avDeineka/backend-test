import { Module } from '@nestjs/common';
import { CoreEventsModule } from '../core-events/core-events.module';
import { PspController } from './psp/psp.controller';
import { GspController } from './gsp/gsp.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [CoreEventsModule],
  controllers: [PspController, GspController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
