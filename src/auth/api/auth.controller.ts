import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from '../application/auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  public login(@Body() dto: LoginDto): Promise<{ accessToken: string }> {
    return this.authService.login(dto.username, dto.password);
  }
}
