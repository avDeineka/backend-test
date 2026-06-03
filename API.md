# API Documentation

This service implements a multi-tenant backend with strict data isolation, stateful authentication, and a robust webhook ingestion engine featuring **Idempotency** and **Transactional Outbox** patterns.

---

## Global Headers

Every request to the API (except public webhooks and auth endpoints where specified) **must** contain the following header for multi-tenant routing and security:

| Header | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `X-Brand-Id` | String | Unique identifier of the tenant/brand | `brand_slots` |

---

## Authentication & Identity

### Register User
* **URL:** `/auth/register`
* **Method:** `POST`
* **Headers:** `X-Brand-Id: <brand_id>`
* **Request Body:**
```json
{
  "email": "developer@example.com",
  "password": "SecurePassword123"
}
```
* Response (201 Created):
```json
{
  "id": "u_83f12b7a-9c60-4c32-b811-64bb823e2001",
  "email": "developer@example.com",
  "brand_id": "brand_slots",
  "created_at": "2026-06-03T10:15:30.000Z"
}
```

---

### Login (Creates Stateful Session)
* URL: /auth/login
* Method: POST
* Headers: X-Brand-Id: <brand_id>
* Request Body:
```json
{
  "email": "developer@example.com",
  "password": "SecurePassword123"
}
```
* Response (200 OK):
```json
{
  "accessToken": "4b6cfa73db26c11a013da182390f71926673248bd81c9a0937a063b40129cf3e",
  "user": {
    "id": "u_83f12b7a-9c60-4c32-b811-64bb823e2001",
    "email": "developer@example.com",
    "brandId": "brand_slots"
  }
}
```

---

### Get Current Profile
* URL: /profile/me
* Method: GET
* Headers: 
  * X-Brand-Id: brand_slots
  * Authorization: Bearer <accessToken>
* Response (200 OK):
```json
{
    "id": "d1fcee50-6116-489f-9618-e48c191929df",
    "brand_id": "brand_slots",
    "email": "user@uaer.co",
    "created_at": "2026-06-03T01:52:46.088Z"
}
```
* Response (403 Forbidden - Tenant Mismatch):

Triggered if X-Brand-Id does not match the token's original brand.

---

## Webhook Ingestion Engine

Webhooks do not require an Authorization header (as they come from external providers), but they require brandId as a query parameter for tenant assignment. Both endpoints guarantee exact-once ingestion via internal idempotency tables.

### PSP (Payment Service Provider) - Stripe Webhook
* URL: /webhooks/psp/stripe?brandId=brand_slots
* Method: POST
* Request Body (Production Stripe Event):
```json
{
  "id": "evt_1NirD82eZvKYlo2CIvbtLWuY",
  "object": "event",
  "api_version": "2023-08-16",
  "created": 1692455351,
  "type": "payment_intent.succeeded",
  "livemode": false,
  "pending_webhooks": 1,
  "request": {
    "id": "req_H4P7CkBbBxRsKu",
    "idempotency_key": "some-key"
  },
  "data": {
    "object": {
      "id": "pi_3NirD82eZvKYlo2C1A2B3C4D",
      "amount": 5000,
      "currency": "usd",
      "status": "succeeded"
    }
  }
}
```
* Response (200 OK - First Ingestion):
```json
{
  "received": true,
  "idempotency": "success"
}
```
* Response (200 OK - Duplicate/Replayed Request):
```json
{
  "received": true,
  "idempotency": "duplicated"
}
```
---

### GSP (Game Service Provider) Webhook
* URL: /webhooks/gsp/pragmatic?brandId=brand_slots
* Method: POST
* Request Body (Standard Gaming Payload):
```json
{
  "transaction_id": "gsp_tx_99999",
  "action": "round.win",
  "user_id": "u_83f12b7a-9c60-4c32",
  "amount": 250,
  "currency": "EUR"
}
```
* Response (200 OK - First Ingestion):
```json
{
  "status": "accepted",
  "idempotency": "success"
}
```
