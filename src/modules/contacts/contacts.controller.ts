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
import { ContactsService } from './contacts.service';
import {
  CreateContactDto,
  UpdateContactDto,
  BulkDeleteDto,
  BulkCreateDto,
} from './dto/contacts.dto';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly service: ContactsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('export')
  exportAll() {
    return this.service.findAllWithMessageCounts();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateContactDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.delete(id);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  bulkDelete(@Body() dto: BulkDeleteDto) {
    return this.service.bulkDelete(dto.ids);
  }

  @Post('bulk')
  bulkCreate(@Body() dto: BulkCreateDto) {
    return this.service.bulkCreate(dto.contacts);
  }

  @Get(':id/messages')
  getContactMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.service.getContactMessages(id, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }
}
