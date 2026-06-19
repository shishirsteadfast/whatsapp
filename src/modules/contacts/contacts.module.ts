import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contact } from './contacts.entity';
import { Message } from '../message/entities/message.entity';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Contact, Message])],
  controllers: [ContactsController],
  providers: [ContactsService],
})
export class ContactsModule {}
