import { Controller, Get, Post, Delete, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { SessionService } from '../session/session.service';

@Controller('sessions/:sessionId/contacts')
export class ContactController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  async findAll(@Param('sessionId') sessionId: string) {
    const engine = this.sessionService.getEngine(sessionId);
    if (!engine) {
      throw new Error('Session is not started');
    }
    return engine.getContacts();
  }

  @Get(':contactId')
  async findOne(@Param('sessionId') sessionId: string, @Param('contactId') contactId: string) {
    const engine = this.sessionService.getEngine(sessionId);
    if (!engine) {
      throw new Error('Session is not started');
    }
    const contact = await engine.getContactById(contactId);
    if (!contact) {
      throw new Error(`Contact ${contactId} not found`);
    }
    return contact;
  }

  @Get('check/:number')
  async checkNumber(@Param('sessionId') sessionId: string, @Param('number') number: string) {
    const engine = this.sessionService.getEngine(sessionId);
    if (!engine) {
      throw new Error('Session is not started');
    }
    const exists = await engine.checkNumberExists(number);
    return {
      number,
      exists,
      whatsappId: exists ? `${number}@c.us` : null,
    };
  }

  // ========== Gap Quick Wins: Profile Picture, Block/Unblock ==========

  @Get(':contactId/profile-picture')
  async getProfilePicture(@Param('sessionId') sessionId: string, @Param('contactId') contactId: string) {
    const engine = this.sessionService.getEngine(sessionId);
    if (!engine) {
      throw new Error('Session is not started');
    }
    const url = await engine.getProfilePicture(contactId);
    return { url };
  }

  @Post(':contactId/block')
  @HttpCode(HttpStatus.OK)
  async blockContact(@Param('sessionId') sessionId: string, @Param('contactId') contactId: string) {
    const engine = this.sessionService.getEngine(sessionId);
    if (!engine) {
      throw new Error('Session is not started');
    }
    await engine.blockContact(contactId);
    return { success: true, message: 'Contact blocked' };
  }

  @Delete(':contactId/block')
  async unblockContact(@Param('sessionId') sessionId: string, @Param('contactId') contactId: string) {
    const engine = this.sessionService.getEngine(sessionId);
    if (!engine) {
      throw new Error('Session is not started');
    }
    await engine.unblockContact(contactId);
    return { success: true, message: 'Contact unblocked' };
  }
}
