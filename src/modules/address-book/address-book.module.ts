import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddressBookContact } from './address-book.entity';
import { Message } from '../message/entities/message.entity';
import { AddressBookService } from './address-book.service';
import { AddressBookController } from './address-book.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AddressBookContact, Message])],
  controllers: [AddressBookController],
  providers: [AddressBookService],
})
export class AddressBookModule {}
