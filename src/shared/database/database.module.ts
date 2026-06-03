import { Module, Global } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Global() // Робимо модуль глобальним, щоб не імпортувати в кожен модуль окремо
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
