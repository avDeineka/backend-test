import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../../shared/database/database.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly dbService: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // 1. Витягуємо токен із заголовка Authorization
    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }
    const token = authHeader.split(' ')[1];

    // 2. Витягуємо поточний brandId із заголовків (для перевірки leakage)
    const currentBrandId = request.headers['x-brand-id'];
    if (!currentBrandId) {
      throw new UnauthorizedException('Missing X-Brand-Id header');
    }

    // 3. Шукаємо активну сесію в базі даних за допомогою Knex
    const session = await this.dbService.db('sessions')
      .where({ token_hash: token })
      .andWhere('expires_at', '>', new Date()) // Перевірка на протухання токена
      .first();

    if (!session) {
      throw new UnauthorizedException('Session expired or invalid');
    }

    // 4. НАЙВАЖЛИВІШЕ: Перевірка на Tenant Leakage
    // Якщо токен належить бренду А, а запит йде до бренду Б — даємо відворот-поворот
    if (session.brand_id !== currentBrandId) {
      throw new ForbiddenException('Tenant mismatch: You cannot access this brand data');
    }

    // 5. Записуємо дані юзера та бренду в об'єкт запиту, щоб контролер мав до них доступ
    request.user = {
      id: session.user_id,
      brandId: session.brand_id,
    };

    return true;
  }
}
