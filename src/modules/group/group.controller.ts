import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { SessionService } from '../session/session.service';

// DTOs
class CreateGroupDto {
  name: string;
  participants: string[];
}

class ParticipantsDto {
  participants: string[];
}

class GroupSubjectDto {
  subject: string;
}

class GroupDescriptionDto {
  description: string;
}

@Controller('sessions/:sessionId/groups')
export class GroupController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  async findAll(@Param('sessionId') sessionId: string) {
    const engine = this.getEngine(sessionId);
    return engine.getGroups();
  }

  @Get(':groupId')
  async findOne(@Param('sessionId') sessionId: string, @Param('groupId') groupId: string) {
    const engine = this.getEngine(sessionId);
    const group = await engine.getGroupInfo(groupId);
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }
    return group;
  }

  @Post()
  async create(@Param('sessionId') sessionId: string, @Body() dto: CreateGroupDto) {
    const engine = this.getEngine(sessionId);
    return engine.createGroup(dto.name, dto.participants);
  }

  @Post(':groupId/participants')
  @HttpCode(HttpStatus.OK)
  async addParticipants(
    @Param('sessionId') sessionId: string,
    @Param('groupId') groupId: string,
    @Body() dto: ParticipantsDto,
  ) {
    const engine = this.getEngine(sessionId);
    await engine.addParticipants(groupId, dto.participants);
    return { success: true, message: 'Participants added' };
  }

  @Delete(':groupId/participants')
  async removeParticipants(
    @Param('sessionId') sessionId: string,
    @Param('groupId') groupId: string,
    @Body() dto: ParticipantsDto,
  ) {
    const engine = this.getEngine(sessionId);
    await engine.removeParticipants(groupId, dto.participants);
    return { success: true, message: 'Participants removed' };
  }

  @Post(':groupId/participants/promote')
  @HttpCode(HttpStatus.OK)
  async promoteParticipants(
    @Param('sessionId') sessionId: string,
    @Param('groupId') groupId: string,
    @Body() dto: ParticipantsDto,
  ) {
    const engine = this.getEngine(sessionId);
    await engine.promoteParticipants(groupId, dto.participants);
    return { success: true, message: 'Participants promoted to admin' };
  }

  @Post(':groupId/participants/demote')
  @HttpCode(HttpStatus.OK)
  async demoteParticipants(
    @Param('sessionId') sessionId: string,
    @Param('groupId') groupId: string,
    @Body() dto: ParticipantsDto,
  ) {
    const engine = this.getEngine(sessionId);
    await engine.demoteParticipants(groupId, dto.participants);
    return { success: true, message: 'Participants demoted from admin' };
  }

  @Put(':groupId/subject')
  async setSubject(
    @Param('sessionId') sessionId: string,
    @Param('groupId') groupId: string,
    @Body() dto: GroupSubjectDto,
  ) {
    const engine = this.getEngine(sessionId);
    await engine.setGroupSubject(groupId, dto.subject);
    return { success: true, message: 'Group subject updated' };
  }

  @Put(':groupId/description')
  async setDescription(
    @Param('sessionId') sessionId: string,
    @Param('groupId') groupId: string,
    @Body() dto: GroupDescriptionDto,
  ) {
    const engine = this.getEngine(sessionId);
    await engine.setGroupDescription(groupId, dto.description);
    return { success: true, message: 'Group description updated' };
  }

  @Post(':groupId/leave')
  @HttpCode(HttpStatus.OK)
  async leave(@Param('sessionId') sessionId: string, @Param('groupId') groupId: string) {
    const engine = this.getEngine(sessionId);
    await engine.leaveGroup(groupId);
    return { success: true, message: 'Left the group' };
  }

  // ========== Gap Quick Wins: Invite Link ==========

  @Get(':groupId/invite-code')
  async getInviteCode(@Param('sessionId') sessionId: string, @Param('groupId') groupId: string) {
    const engine = this.getEngine(sessionId);
    const inviteCode = await engine.getGroupInviteCode(groupId);
    return {
      inviteCode,
      inviteLink: `https://chat.whatsapp.com/${inviteCode}`,
    };
  }

  @Post(':groupId/invite-code/revoke')
  @HttpCode(HttpStatus.OK)
  async revokeInviteCode(@Param('sessionId') sessionId: string, @Param('groupId') groupId: string) {
    const engine = this.getEngine(sessionId);
    const newCode = await engine.revokeGroupInviteCode(groupId);
    return {
      inviteCode: newCode,
      inviteLink: `https://chat.whatsapp.com/${newCode}`,
      message: 'Invite code revoked and new one generated',
    };
  }

  private getEngine(sessionId: string) {
    const engine = this.sessionService.getEngine(sessionId);
    if (!engine) {
      throw new Error('Session is not started');
    }
    return engine;
  }
}
