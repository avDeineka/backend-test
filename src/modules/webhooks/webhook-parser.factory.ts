import { Injectable, BadRequestException } from '@nestjs/common';
import { WebhookAdapter } from './interfaces/webhook-adapter.interface';
import { StripeAdapter } from './adapters/stripe.adapter';
import { GspAdapter } from './adapters/gsp.adapter';
import { RawEvent } from '../../shared/database/interfaces/raw-event.interface';

@Injectable()
export class WebhookParserFactory {
  private adapters: WebhookAdapter[];

  constructor(
    stripeAdapter: StripeAdapter,
    gspAdapter: GspAdapter,
  ) {
    this.adapters = [stripeAdapter, gspAdapter];
  }

  parse(brandId: string, provider: string, payload: any): RawEvent {
    const adapter = this.adapters.find(a => a.supports(provider));
    
    if (!adapter) {
      throw new BadRequestException(`Unsupported webhook provider: ${provider}`);
    }

    return adapter.normalize(brandId, provider, payload);
  }
}