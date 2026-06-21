import { Controller, Post, Get, Put, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { CurrentUser } from './decorators/auth.decorators';
import { Public } from './decorators/auth.decorators';
import { User } from './entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  @Get('me')
  me(@CurrentUser() user: User) {
    const { password: _pw, ...safeUser } = user;
    return safeUser;
  }

  @Put('profile')
  updateProfile(@CurrentUser() user: User, @Body() dto: { name?: string; phone?: string; profilePic?: string }) {
    return this.authService.updateProfile(user.id, dto);
  }

  @Put('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(@CurrentUser() user: User, @Body() dto: { currentPassword: string; newPassword: string }) {
    return this.authService.changePassword(user.id, dto);
  }
}
