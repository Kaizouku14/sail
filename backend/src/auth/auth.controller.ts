import * as common from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { JwtPayload } from '@/common/types/jwt-payload.type';

@common.Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @common.Post('login')
  async login(@common.Body() body: LoginDto) {
    return await this.authService.login(body);
  }

  @common.Post('register')
  async register(@common.Body() body: RegisterDto) {
    return await this.authService.register(body);
  }

  @common.UseGuards(AuthGuard)
  async getStats(@CurrentUser() user: JwtPayload) {
    return this.authService.getStats(user.id);
  }
}
