import { Controller, Get, Param, Query } from '@nestjs/common';
import { StatsService } from './stats.service';
import { StatsQueryDto } from './dto/stats-query.dto';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('overview')
  async getOverview() {
    return this.statsService.getOverview();
  }

  @Get('messages')
  async getMessageStats(@Query() query: StatsQueryDto) {
    return this.statsService.getMessageStats(query.period || '24h');
  }

  @Get('sessions/:sessionId')
  async getSessionStats(@Param('sessionId') sessionId: string) {
    return this.statsService.getSessionStats(sessionId);
  }
}
