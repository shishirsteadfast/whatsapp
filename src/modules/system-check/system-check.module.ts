import { Module } from '@nestjs/common';
import { SystemCheckController } from './system-check.controller';
import { SystemCheckService } from './system-check.service';

@Module({
  controllers: [SystemCheckController],
  providers: [SystemCheckService],
})
export class SystemCheckModule {}
