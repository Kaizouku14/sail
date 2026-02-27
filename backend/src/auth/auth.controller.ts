import { Controller, Post, UseGuards, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { JwtPayload } from '@/common/types/jwt-payload.type';
import { RateLimit, RateLimitGuard } from '@/common/guard/rate-limit.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(RateLimitGuard)
  @RateLimit(5, 60)
  async login(@Body() body: LoginDto) {
    return await this.authService.login(body);
  }

  @Post('register')
  async register(@Body() body: RegisterDto) {
    return await this.authService.register(body);
  }

  @Get('stats')
  @UseGuards(AuthGuard)
  async getStats(@CurrentUser() user: JwtPayload) {
    return this.authService.getStats(user.id);
  }
}
