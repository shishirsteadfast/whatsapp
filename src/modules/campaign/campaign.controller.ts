import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignQueryDto } from './dto/campaign-query.dto';

@Controller('campaigns')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  async create(@Body() dto: CreateCampaignDto) {
    return this.campaignService.create(dto);
  }

  @Get()
  async findAll(@Query() query: CampaignQueryDto) {
    return this.campaignService.findAll(query);
  }

  @Get('stats')
  async getStats() {
    return this.campaignService.getStats();
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaignService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.campaignService.remove(id);
    return { success: true };
  }

  @Post(':id/start')
  async start(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaignService.start(id);
  }

  @Post(':id/pause')
  async pause(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaignService.pause(id);
  }

  @Post(':id/cancel')
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaignService.cancel(id);
  }

  @Post(':id/resend-failed')
  async resendFailed(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaignService.resendFailed(id);
  }

  @Get(':id/recipients')
  async getRecipients(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.campaignService.getRecipients(
      id,
      status,
      search,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
  }
}
