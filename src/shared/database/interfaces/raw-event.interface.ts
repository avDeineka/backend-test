export interface RawEvent {
  id?: number;
  brand_id: string;
  provider: string;
  event_id: string;
  event_type: string;
  
  // Нові опціональні поля для фінансової аналітики
  user_id?: string | null;
  amount?: number | null;
  currency?: string | null;
  idempotency_key?: string | null;
  
  payload: any;
  status: 'success' | 'duplicated' | 'failed';
  created_at?: Date;
}
