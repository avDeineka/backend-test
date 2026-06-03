import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { TenantId } from '../../shared/tenant/tenant.decorator';
import { AuthGuard } from './auth.guard'; // Імпортуємо наш новий гвардіан

@Controller()
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Post('auth/register')
  async register(
    @TenantId() brandId: string,
    @Body() dto: RegisterDto,
  ) {
    return this.identityService.register(brandId, dto);
  }

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  async login(
    @TenantId() brandId: string,
    @Body() dto: LoginDto,
  ) {
    return this.identityService.login(brandId, dto);
  }

  @Get('profile/me')
  @UseGuards(AuthGuard) // Вішаємо захист сюди
  async getProfile(@Req() req: any) {
    // Дані гарантовано валідні та перевірені гвардіаном на витік тенантів
    const userId = req.user.id;
    const brandId = req.user.brandId;
    
    return this.identityService.getProfile(userId, brandId);
  }
}
