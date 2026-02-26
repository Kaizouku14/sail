import * as common from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@common.Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @common.Post('login')
  async login(@common.Body() body: LoginDto) {
    const { email, password } = body;
    const user = await this.authService.login(email, password);
    return user;
  }

  @common.Post('register')
  async register(@common.Body() body: RegisterDto) {
    const { username, email, password } = body;
    const user = await this.authService.register(username, email, password);
    return user;
  }
}
