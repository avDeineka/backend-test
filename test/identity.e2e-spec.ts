import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/shared/database/database.service';

describe('Identity & Tenant Leakage (E2E)', () => {
  let app: INestApplication;
  let dbService: DatabaseService;

  // Очищення бази перед тестами, щоб тести були детермінованими
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    dbService = app.get<DatabaseService>(DatabaseService);
    
    // Очищаємо таблиці перед тестами
    await dbService.db('sessions').del();
    await dbService.db('users').del();
  });

  afterAll(async () => {
    // Закриваємо з'єднання з базою після тестів
    await dbService.db.destroy();
    await app.close();
  });

  const testUser = {
    email: 'test-tenant@example.com',
    password: 'password123',
  };
  
  let accessToken: string;
  const brandA = 'brand_slots';
  const brandB = 'brand_crypto';

  it('1. Має успішно зареєструвати користувача для Brand A', async () => {
    const response = await (request.default ? request.default(app.getHttpServer()) : (request as any)(app.getHttpServer()))
      .post('/auth/register')
      .set('x-brand-id', brandA)
      .send(testUser)
      .expect(HttpStatus.CREATED);

    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toBe(testUser.email);
    expect(response.body.brand_id).toBe(brandA);
  });

  it('2. Має успішно залогінити користувача у Brand A і повернути токен', async () => {
    const response = await (request.default ? request.default(app.getHttpServer()) : (request as any)(app.getHttpServer()))
      .post('/auth/login')
      .set('x-brand-id', brandA)
      .send(testUser)
      .expect(HttpStatus.OK);

    expect(response.body).toHaveProperty('accessToken');
    accessToken = response.body.accessToken;
  });

  it('3. Має дозволити доступ до профілю, якщо brand_id збігається', async () => {
    const response = await (request.default ? request.default(app.getHttpServer()) : (request as any)(app.getHttpServer()))
      .get('/profile/me')
      .set('x-brand-id', brandA)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(HttpStatus.OK);

    expect(response.body.email).toBe(testUser.email);
    expect(response.body.brand_id).toBe(brandA);
  });

  it('4. КРИТИЧНО: Має повернути 403 Forbidden при спробі Tenant Leakage (запит до Brand B з токеном від Brand A)', async () => {
    const response = await (request.default ? request.default(app.getHttpServer()) : (request as any)(app.getHttpServer()))
      .get('/profile/me')
      .set('x-brand-id', brandB) // Змінюємо бренд на інший!
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(HttpStatus.FORBIDDEN); // Очікуємо жорстке блокування

    expect(response.body.message).toContain('Tenant mismatch');
  });
});
