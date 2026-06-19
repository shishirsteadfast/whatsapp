import { Controller, Get, Post, Put, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { PluginsService } from './plugins.service';
import { PluginDto, PluginConfigDto } from './dto/plugin.dto';

@Controller('plugins')
export class PluginsController {
  constructor(private readonly pluginsService: PluginsService) {}

  @Get()
  findAll(): PluginDto[] {
    return this.pluginsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): PluginDto {
    return this.pluginsService.findOne(id);
  }

  @Post(':id/enable')
  @HttpCode(HttpStatus.OK)
  async enable(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    return await this.pluginsService.enable(id);
  }

  @Post(':id/disable')
  @HttpCode(HttpStatus.OK)
  async disable(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    return await this.pluginsService.disable(id);
  }

  @Put(':id/config')
  updateConfig(@Param('id') id: string, @Body() configDto: PluginConfigDto): { success: boolean; message: string } {
    return this.pluginsService.updateConfig(id, configDto.config);
  }

  @Get(':id/health')
  async healthCheck(@Param('id') id: string): Promise<{ healthy: boolean; message?: string }> {
    return await this.pluginsService.healthCheck(id);
  }
}
