import { Module } from '@nestjs/common';
import { InfraController } from './infra.controller';

@Module({
  controllers: [InfraController],
})
export class InfraModule {}
