import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { StatusService } from './status.service';
import { SendTextStatusDto } from './dto/send-text-status.dto';
import { SendImageStatusDto, SendVideoStatusDto } from './dto/send-media-status.dto';

@Controller('sessions/:sessionId/status')
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Get()
  async getStatuses(@Param('sessionId') sessionId: string) {
    return { statuses: await this.statusService.getStatuses(sessionId) };
  }

  @Get(':contactId')
  async getContactStatus(@Param('sessionId') sessionId: string, @Param('contactId') contactId: string) {
    return { statuses: await this.statusService.getContactStatus(sessionId, contactId) };
  }

  @Post('send-text')
  async sendTextStatus(@Param('sessionId') sessionId: string, @Body() dto: SendTextStatusDto) {
    return this.statusService.postTextStatus(sessionId, dto.text, {
      backgroundColor: dto.backgroundColor,
      font: dto.font,
    });
  }

  @Post('send-image')
  async sendImageStatus(@Param('sessionId') sessionId: string, @Body() dto: SendImageStatusDto) {
    return this.statusService.postImageStatus(sessionId, dto.image, dto.caption);
  }

  @Post('send-video')
  async sendVideoStatus(@Param('sessionId') sessionId: string, @Body() dto: SendVideoStatusDto) {
    return this.statusService.postVideoStatus(sessionId, dto.video, dto.caption);
  }

  @Delete(':statusId')
  async deleteStatus(@Param('sessionId') sessionId: string, @Param('statusId') statusId: string) {
    await this.statusService.deleteStatus(sessionId, statusId);
    return { message: 'Status deleted successfully' };
  }
}
