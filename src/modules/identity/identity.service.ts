import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../shared/database/database.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class IdentityService {
  private readonly saltRounds = 10;

  constructor(private readonly dbService: DatabaseService) {}

  private get db() {
    return this.dbService.db;
  }

  async register(brandId: string, dto: RegisterDto) {
    const { email, password } = dto;
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Перевіряємо, чи є такий юзер САМЕ в цьому бренді
    const existingUser = await this.db('users')
      .where({ brand_id: brandId, email: normalizedEmail })
      .first();

    if (existingUser) {
      throw new ConflictException(`User with email ${email} already exists for this brand.`);
    }

    // 2. Хешуємо пароль
    const passwordHash = await bcrypt.hash(password, this.saltRounds);

    // 3. Зберігаємо в базу
    const [newUser] = await this.db('users')
      .insert({
        brand_id: brandId,
        email: normalizedEmail,
        password_hash: passwordHash,
      })
      .returning(['id', 'brand_id', 'email', 'created_at']);

    return newUser;
  }

  async login(brandId: string, dto: LoginDto) {
    const { email, password } = dto;
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Шукаємо користувача в межах конкретного бренду
    const user = await this.db('users')
      .where({ brand_id: brandId, email: normalizedEmail })
      .first();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Перевіряємо пароль
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Створюємо сесію (у межах цього завдання просять таблицю sessions)
    const token = bcrypt.hashSync(`${user.id}-${Date.now()}`, 5); // Простий токен-рядок для демонстрації
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Сесія на 24 години

    await this.db('sessions').insert({
      user_id: user.id,
      brand_id: brandId,
      token_hash: token, // Для тестового збережемо так, в ідеалі — sha256 хеш від токена
      expires_at: expiresAt,
    });

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        brandId: user.brand_id,
      },
    };
  }

  async getProfile(userId: string, brandId: string) {
    if (!userId || !brandId) {
      throw new UnauthorizedException();
    }

    const user = await this.db('users')
      .where({ id: userId, brand_id: brandId }) // Жорстка ізоляція!
      .select('id', 'brand_id', 'email', 'created_at')
      .first();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
