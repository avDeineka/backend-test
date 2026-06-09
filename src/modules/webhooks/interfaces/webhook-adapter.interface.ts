import { RawEvent } from '../../../shared/database/interfaces/raw-event.interface';

export interface WebhookAdapter {
  supports(provider: string): boolean;
  normalize(brandId: string, provider: string, payload: any): RawEvent;
}