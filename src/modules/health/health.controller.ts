import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/auth.decorators';

interface HealthCheckResult {
  status: 'ok' | 'error';
  info?: Record<string, unknown>;
  error?: Record<string, unknown>;
  details?: Record<string, unknown>;
}

@Controller('health')
@Public()
export class HealthController {
  @Get()
  check(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('live')
  liveness(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  readiness(): HealthCheckResult {
    // In the future, check database connection, Redis, etc.
    return {
      status: 'ok',
      details: {
        database: { status: 'up' },
      },
    };
  }
}
