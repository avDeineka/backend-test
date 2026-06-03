import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IdentityModule } from './modules/identity/identity.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { CoreEventsModule } from './modules/core-events/core-events.module';
import { DatabaseModule } from './shared/database/database.module';
import { TenantModule } from './shared/tenant/tenant.module';

@Module({
  imports: [IdentityModule, WebhooksModule, CoreEventsModule, DatabaseModule, TenantModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
