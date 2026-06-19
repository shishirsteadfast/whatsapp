import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Contact } from './contacts.entity';
import { Message } from '../message/entities/message.entity';
import {
  CreateContactDto,
  UpdateContactDto,
} from './dto/contacts.dto';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private readonly repo: Repository<Contact>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
  ) {}

  findAll(): Promise<Contact[]> {
    return this.repo.find({
      order: { createdAt: 'DESC' },
      relations: ['country', 'state', 'city'],
    });
  }

  async findOne(id: string): Promise<Contact> {
    const contact = await this.repo.findOne({
      where: { id },
      relations: ['country', 'state', 'city'],
    });
    if (!contact) throw new NotFoundException(`Contact ${id} not found`);
    return contact;
  }

  async create(dto: CreateContactDto): Promise<Contact> {
    const existing = await this.repo.findOne({ where: { phone: dto.phone } });
    if (existing) {
      throw new ConflictException(`Phone number ${dto.phone} already exists`);
    }
    const contact = this.repo.create({
      fullName:    dto.fullName    ?? null,
      phone:       dto.phone,
      countryCode: dto.countryCode,
      countryId:   dto.countryId   ?? null,
      stateId:     dto.stateId     ?? null,
      cityId:      dto.cityId      ?? null,
      address:     dto.address     ?? null,
      note:        dto.note        ?? null,
    });
    const saved = await this.repo.save(contact);
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateContactDto): Promise<Contact> {
    const contact = await this.findOne(id);

    if (dto.phone && dto.phone !== contact.phone) {
      const existing = await this.repo.findOne({ where: { phone: dto.phone } });
      if (existing) {
        throw new ConflictException(`Phone number ${dto.phone} already exists`);
      }
    }

    Object.assign(contact, {
      ...(dto.fullName    !== undefined && { fullName:    dto.fullName    ?? null }),
      ...(dto.phone       !== undefined && { phone:       dto.phone }),
      ...(dto.countryCode !== undefined && { countryCode: dto.countryCode }),
      ...(dto.countryId   !== undefined && { countryId:   dto.countryId   ?? null }),
      ...(dto.stateId     !== undefined && { stateId:     dto.stateId     ?? null }),
      ...(dto.cityId      !== undefined && { cityId:      dto.cityId      ?? null }),
      ...(dto.address     !== undefined && { address:     dto.address     ?? null }),
      ...(dto.note        !== undefined && { note:        dto.note        ?? null }),
    });

    const saved = await this.repo.save(contact);
    return this.findOne(saved.id);
  }

  async delete(id: string): Promise<void> {
    const contact = await this.findOne(id);
    await this.repo.remove(contact);
  }

  async bulkDelete(ids: string[]): Promise<{ deleted: number }> {
    const contacts = await this.repo.findBy({ id: In(ids) });
    await this.repo.remove(contacts);
    return { deleted: contacts.length };
  }

  async bulkCreate(
    dtos: CreateContactDto[],
  ): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    for (const dto of dtos) {
      const existing = await this.repo.findOne({ where: { phone: dto.phone } });
      if (existing) { skipped++; continue; }
      const contact = this.repo.create({
        fullName:    dto.fullName    ?? null,
        phone:       dto.phone,
        countryCode: dto.countryCode,
        countryId:   dto.countryId   ?? null,
        stateId:     dto.stateId     ?? null,
        cityId:      dto.cityId      ?? null,
        address:     dto.address     ?? null,
        note:        dto.note        ?? null,
      });
      await this.repo.save(contact);
      created++;
    }

    return { created, skipped };
  }

  async getContactMessages(
    id: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<{ messages: Message[]; total: number }> {
    const contact = await this.findOne(id);
    const chatId = `${contact.countryCode.replace('+', '')}${contact.phone}@c.us`;
    const { limit = 50, offset = 0 } = options;

    const [messages, total] = await this.messageRepo
      .createQueryBuilder('message')
      .where('message.chatId = :chatId', { chatId })
      .orderBy('message.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { messages, total };
  }

  async findAllWithMessageCounts(): Promise<Array<Contact & { totalSentMessages: number }>> {
    const contacts = await this.repo.find({
      order: { createdAt: 'DESC' },
      relations: ['country', 'state', 'city'],
    });

    if (contacts.length === 0) return [];

    // Build chatId list for all contacts
    const chatIdMap = new Map<string, string>();
    for (const c of contacts) {
      const chatId = `${c.countryCode.replace('+', '')}${c.phone}@c.us`;
      chatIdMap.set(chatId, c.id);
    }

    // Count outgoing messages per chatId in a single query
    const results = await this.messageRepo
      .createQueryBuilder('message')
      .select('message.chatId', 'chatId')
      .addSelect('COUNT(*)', 'count')
      .where('message.chatId IN (:...chatIds)', { chatIds: [...chatIdMap.keys()] })
      .andWhere('message.direction = :direction', { direction: 'outgoing' })
      .groupBy('message.chatId')
      .getRawMany<{ chatId: string; count: string }>();

    const countMap = new Map<string, number>();
    for (const r of results) {
      countMap.set(r.chatId, parseInt(r.count, 10));
    }

    return contacts.map(c => {
      const chatId = `${c.countryCode.replace('+', '')}${c.phone}@c.us`;
      return {
        ...c,
        totalSentMessages: countMap.get(chatId) ?? 0,
      };
    });
  }
}
