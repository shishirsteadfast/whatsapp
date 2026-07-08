import { Controller, Post, Get, Put, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { CurrentUser } from './decorators/auth.decorators';
import { Public } from './decorators/auth.decorators';
import { User } from './entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<LoginResponseDto> {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    try {
      const result = await this.authService.login(dto);
      await this.auditService.logInfo(AuditAction.USER_LOGIN, {
        user: result.user,
        ipAddress,
        userAgent,
      });
      return result;
    } catch (error) {
      await this.auditService.logWarn(AuditAction.USER_LOGIN_FAILED, {
        ipAddress,
        userAgent,
        metadata: { phone: dto.phone },
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
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
