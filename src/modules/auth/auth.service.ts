import { Injectable, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { createLogger } from '../../common/services/logger.service';
import { ConfigService } from '@nestjs/config';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = createLogger('AuthService');

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaultUser();

    const apiBaseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 2785}`;
    const dashboardUrl = process.env.DASHBOARD_URL || `http://localhost:${process.env.DASHBOARD_PORT || 2886}`;

    this.logger.log('');
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.logger.log('');
    this.logger.log('  Welcome to OpenWA - WhatsApp API Gateway');
    this.logger.log('');
    this.logger.log(`  Dashboard : ${dashboardUrl}`);
    this.logger.log(`  API Docs  : ${apiBaseUrl}/api/docs`);
    this.logger.log('');
    this.logger.log('  Default login credentials:');
    this.logger.log('    Phone    : 01712345678');
    this.logger.log('    Password : password');
    this.logger.log('');
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.logger.log('');
  }

  private async seedDefaultUser(): Promise<void> {
    const count = await this.userRepository.count();
    if (count > 0) return;

    const hash = await bcrypt.hash('password', BCRYPT_ROUNDS);
    const user = this.userRepository.create({
      phone: '01712345678',
      password: hash,
      name: 'Admin',
      role: UserRole.ADMIN,
    });
    await this.userRepository.save(user);
    this.logger.log('Default admin user created (phone: 01712345678)');
  }

  async login(dto: LoginDto): Promise<{ access_token: string; user: Omit<User, 'password'> }> {
    const user = await this.userRepository.findOne({ where: { phone: dto.phone, isActive: true } });
    if (!user) throw new UnauthorizedException('Invalid phone or password');

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('Invalid phone or password');

    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    const payload = { sub: user.id, phone: user.phone, role: user.role };
    const access_token = await this.jwtService.signAsync(payload);

    const { password: _pw, ...safeUser } = user;
    return { access_token, user: safeUser };
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async validateUser(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id, isActive: true } });
  }

  async validateToken(token: string): Promise<User | null> {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token, {
        secret: this.configService.get<string>('jwtSecret'),
      });
      return this.userRepository.findOne({ where: { id: payload.sub, isActive: true } });
    } catch {
      return null;
    }
  }

  hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
    const hierarchy: Record<UserRole, number> = {
      [UserRole.VIEWER]: 1,
      [UserRole.OPERATOR]: 2,
      [UserRole.ADMIN]: 3,
    };
    return hierarchy[userRole] >= hierarchy[requiredRole];
  }
}
