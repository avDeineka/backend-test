import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import knex, { Knex } from 'knex';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private knexInstance!: Knex;

  onModuleInit() {
    this.knexInstance = knex({
      client: 'pg',
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'supersecretpassword',
        database: process.env.DB_NAME || 'backend_test',
      },
      pool: { min: 2, max: 10 },
    });
  }

  onModuleDestroy() {
    return this.knexInstance.destroy();
  }

  // Геттер для отримання інстансу Knex у сервісах
  get db(): Knex {
    return this.knexInstance;
  }
}
