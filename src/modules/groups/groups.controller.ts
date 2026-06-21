import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import {
  CreateGroupDto,
  UpdateGroupDto,
  AddMembersDto,
  RemoveMembersDto,
  FilterContactsDto,
  BulkCreateWithGroupDto,
} from './dto/groups.dto';

@Controller('groups')
export class GroupsController {
  constructor(private readonly service: GroupsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateGroupDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateGroupDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.delete(id);
  }

  @Post(':id/members')
  addMembers(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddMembersDto) {
    return this.service.addMembers(id, dto.contactIds);
  }

  @Delete(':id/members')
  @HttpCode(HttpStatus.OK)
  removeMembers(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RemoveMembersDto) {
    return this.service.removeMembers(id, dto.contactIds);
  }

  @Get('contacts/filter')
  filterContacts(@Query() filters: FilterContactsDto) {
    return this.service.filterContacts(filters);
  }

  @Post('bulk-create-with-group')
  bulkCreateWithGroup(@Body() dto: BulkCreateWithGroupDto) {
    return this.service.bulkCreateWithGroup(dto.name, dto.description, dto.contacts);
  }
}
