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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AddressBookService } from './address-book.service';
import {
  CreateAddressBookContactDto,
  UpdateAddressBookContactDto,
  BulkDeleteDto,
  BulkCreateDto,
} from './dto/address-book.dto';

@ApiTags('contacts')
@ApiBearerAuth()
@Controller('contacts')
export class AddressBookController {
  constructor(private readonly service: AddressBookService) {}

  @Get()
  @ApiOperation({ summary: 'List all address-book contacts' })
  @ApiResponse({ status: 200, description: 'Contact list' })
  findAll() {
    return this.service.findAll();
  }

  @Get('export')
  @ApiOperation({ summary: 'Export all contacts with message counts' })
  @ApiResponse({ status: 200, description: 'Contact export data' })
  exportAll() {
    return this.service.findAllWithMessageCounts();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one address-book contact' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an address-book contact' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 409, description: 'Phone already exists' })
  create(@Body() dto: CreateAddressBookContactDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an address-book contact' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  @ApiResponse({ status: 409, description: 'Phone already exists' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressBookContactDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an address-book contact' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404 })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.delete(id);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk delete contacts by IDs' })
  @ApiResponse({ status: 200 })
  bulkDelete(@Body() dto: BulkDeleteDto) {
    return this.service.bulkDelete(dto.ids);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Bulk import contacts (skips duplicates)' })
  @ApiResponse({ status: 201 })
  bulkCreate(@Body() dto: BulkCreateDto) {
    return this.service.bulkCreate(dto.contacts);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get message history for a contact' })
  @ApiResponse({ status: 200, description: 'Message history' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
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
