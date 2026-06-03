-- Створюємо розширення для генерації UUID, якщо плануєш використовувати їх як PK
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

---
-- 1. ТАБЛИЦЯ КОРИСТУВАЧІВ (users)
---
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Унікальність email ТІЛЬКИ в межах одного бренду!
    -- Юзер з email 'test@test.com' може існувати і в brandA, і в brandB окремо.
    CONSTRAINT uq_users_brand_email UNIQUE (brand_id, email)
);

-- Індекс для швидкого пошуку користувача під час авторизації в розрізі тенанта
CREATE INDEX idx_users_brand_email ON users(brand_id, email);


---
-- 2. ТАБЛИЦЯ СЕСІЙ (sessions)
---
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    brand_id VARCHAR(50) NOT NULL, -- Дублюємо для швидкої перевірки leakage без JOIN
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_sessions_users FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Індекс для валідації токена/сесії
CREATE INDEX idx_sessions_brand_token ON sessions(brand_id, token_hash);


---
-- 3. ТАБЛИЦЯ ІДЕМПОТЕНТНОСТІ (idempotency_keys)
---
CREATE TABLE idempotency_keys (
    -- Ключем зазвичай виступає ID події від Stripe/GSP (наприклад, 'evt_1Oxi23...')
    idempotency_key VARCHAR(255) NOT NULL,
    brand_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'processing', 'completed', 'failed'
    response_code INT,           -- Зберігаємо код відповіді, щоб повернути такий самий при дублікаті
    response_body JSONB,         -- Опціонально: зберігаємо тіло відповіді, якщо треба повторити reply
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ключ унікальний лише в межах одного бренду
    PRIMARY KEY (brand_id, idempotency_key)
);


---
-- 4. ТАБЛИЦЯ СИРИХ ПОДІЙ (raw_events)
---
CREATE TABLE raw_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id VARCHAR(50) NOT NULL,
    provider VARCHAR(50) NOT NULL,      -- 'stripe', 'game provider x'
    event_type VARCHAR(100) NOT NULL,    -- 'charge.succeeded', 'round.completed'
    external_event_id VARCHAR(255),     -- ID події з боку провайдера (корисно для лінкування з idempotency)
    payload JSONB NOT NULL,             -- Сирий JSON вебхука без жодних змін
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processed', 'failed'
    error_message TEXT,                 -- Якщо обробка впала, запишемо сюди
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Індекси для аналітики та майбутнього процесингу (Ledger Integration)
CREATE INDEX idx_raw_events_brand_status ON raw_events(brand_id, status);
CREATE INDEX idx_raw_events_external_id ON raw_events(brand_id, external_event_id);