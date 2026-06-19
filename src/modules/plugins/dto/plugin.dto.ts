import { IsObject } from 'class-validator';
import type { PluginConfigSchema } from '../../../core/plugins';
import { PluginType, PluginStatus } from '../../../core/plugins';

export class PluginDto {
  id!: string;

  name!: string;

  version!: string;

  type!: PluginType;

  description?: string;

  author?: string;

  status!: PluginStatus;

  config!: Record<string, unknown>;

  builtIn!: boolean;

  provides!: string[];

  configSchema?: PluginConfigSchema;

  loadedAt?: string;

  enabledAt?: string;

  error?: string;
}

export class PluginConfigDto {
  @IsObject()
  config!: Record<string, unknown>;
}
