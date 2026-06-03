# Architectural Decisions Document (ADR)

This document outlines the core technical decisions made during the development of the Multi-Tenant Backend Service.

## 1. Multi-Tenancy & Data Isolation Pattern
* **Decision:** We implemented a **Shared Database, Shared Schema (Discriminator Column)** strategy. Every single table (except global configurations) contains a `brand_id` column.
* **Justification:** For a startup or small/medium business setup, this approach provides the best cost-to-performance ratio and ultra-low maintenance overhead while ensuring fast database pooling.
* **Security Mitigation:** To prevent **Tenant Leakage**, the `AuthGuard` performs a strict dual-validation check: it cross-references the `X-Brand-Id` header sent by the client with the hardcoded `brand_id` linked to the active user session in the database. A mismatch instantly triggers a `403 Forbidden` response.

## 2. Stateful Sessions vs. Stateless JWT
* **Decision:** We chose **Stateful Sessions** stored in the database (`sessions` table) over traditional stateless JWTs.
* **Justification:** In high-risk domains like fintech or igaming, security is a priority. Stateless JWTs cannot be instantly revoked without complex blacklist implementations (like Redis clusters). 
* **Implementation Details:** * Tokens are generated using Node.js's cryptographically secure `crypto.randomBytes(32)`.
  * To prevent database-leaks vulnerabilities, only the `sha256` hash of the token (`token_hash`) is stored in the database.
  * Sessions can be instantly revoked by the system administrator, providing immediate lockout capabilities for compromised accounts.

## 3. Webhook Idempotency Engine
* **Decision:** Implemented an exact-once processing mechanism using an upsert/conflict strategy inside a single database transaction.
* **Justification:** Webhook providers like Stripe or gaming hubs operate on an "at-least-once" delivery guarantee, meaning duplicates are expected. 
* **Flow Analysis:** We use the unique event identifier (e.g., Stripe's `id` or GSP's `transaction_id`) combined with the provider name as a unique key constraint. Upon arrival, we attempt to save it. If a unique key collision occurs, the transaction gracefully completes with an `idempotency: duplicated` flag without duplicating side effects, yet returning a `200 OK` to stop the provider from retrying.

## 4. Database Layer (Knex.js vs Heavy ORMs)
* **Decision:** We utilized **Knex.js** as a lightweight query builder instead of heavy ORMs like TypeORM or Prisma.
* **Justification:** * **Performance:** Knex.js provides raw SQL execution speeds with virtually zero memory overhead.
  * **Control:** Complex multi-tenant filtering and precise transactional locking (crucial for webhooks and financial balance handling) are vastly easier to manage and audit through explicit Knex query building.

## 5. Deployment & Development Consistency
* **Decision:** Containerized via Docker Compose using a multi-stage Docker build pipeline paired with anonymous volumes for node dependencies.
* **Justification:** Isolating the production runtime layer (`runner`) from development tools keeps the final image tiny and clean, while anonymous volume mounting (`/app/node_modules` and `/app/dist`) prevents local OS cache contamination during active development.
