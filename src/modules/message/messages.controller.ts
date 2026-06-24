import { Controller, Get, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';

@Controller('messages')
export class MessagesController {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
  ) {}

  @Get()
  findAll(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('direction') direction?: string,
    @Query('sessionId') sessionId?: string,
    @Query('status') status?: string,
  ) {
    const qb = this.messageRepo.createQueryBuilder('message').orderBy('message.createdAt', 'DESC');

    if (direction) {
      qb.andWhere('message.direction = :direction', { direction });
    }
    if (sessionId) {
      qb.andWhere('message.sessionId = :sessionId', { sessionId });
    }
    if (status) {
      qb.andWhere('message.status = :status', { status });
    }

    const lim = limit ? parseInt(limit, 10) : 50;
    const off = offset ? parseInt(offset, 10) : 0;

    qb.skip(off).take(lim);

    return qb.getMany();
  }
}
