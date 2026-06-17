import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { SessionModule } from './modules/session/session.module';
import { MessageModule } from './modules/message/message.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { EngineModule } from './engine/engine.module';
import { LoggerModule } from './common/services/logger.module';
import { SettingsModule } from './modules/settings/settings.module';
import { InfraModule } from './modules/infra/infra.module';
import { EventsModule } from './modules/events/events.module';
import { ContactModule } from './modules/contact/contact.module';
import { GroupModule } from './modules/group/group.module';
import { LabelModule } from './modules/label/label.module';
import { ChannelModule } from './modules/channel/channel.module';
import { CacheModule } from './common/cache';
import { StorageModule } from './common/storage/storage.module';
import { StatsModule } from './modules/stats/stats.module';
import { StatusModule } from './modules/status/status.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { HooksModule } from './core/hooks';
import { PluginsModule } from './core/plugins';
import { PluginsApiModule } from './modules/plugins/plugins.module';
import { QueueModule } from './modules/queue/queue.module';
import { AddressBookModule } from './modules/address-book/address-book.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Single SQLite database — all tables in one file
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'sqlite' as const,
        database: configService.get<string>('database.database', './data/openwa.sqlite'),
        entities: [__dirname + '/modules/**/*.entity{.ts,.js}'],
        synchronize: configService.get<boolean>('database.synchronize', true),
        logging: configService.get<boolean>('database.logging', false),
      }),
    }),

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: configService.get<number>('api.rateLimit.shortTtl', 1000),
            limit: configService.get<number>('api.rateLimit.shortLimit', 10),
          },
          {
            name: 'medium',
            ttl: configService.get<number>('api.rateLimit.mediumTtl', 60000),
            limit: configService.get<number>('api.rateLimit.mediumLimit', 100),
          },
          {
            name: 'long',
            ttl: configService.get<number>('api.rateLimit.longTtl', 3600000),
            limit: configService.get<number>('api.rateLimit.longLimit', 1000),
          },
        ],
      }),
    }),

    HooksModule,
    PluginsModule,
    LoggerModule,
    CacheModule,
    StorageModule,
    AuditModule,
    EventsModule,
    QueueModule.register(process.env.REDIS_ENABLED === 'true'),
    AuthModule,
    EngineModule,
    SessionModule,
    MessageModule,
    WebhookModule,
    HealthModule,
    SettingsModule,
    InfraModule,
    ContactModule,
    AddressBookModule,
    GroupModule,
    LabelModule,
    ChannelModule,
    StatsModule,
    StatusModule,
    CatalogModule,
    PluginsApiModule,
  ],
})
export class AppModule {}
