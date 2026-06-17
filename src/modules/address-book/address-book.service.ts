import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AddressBookContact } from './address-book.entity';
import {
  CreateAddressBookContactDto,
  UpdateAddressBookContactDto,
} from './dto/address-book.dto';

@Injectable()
export class AddressBookService {
  constructor(
    @InjectRepository(AddressBookContact)
    private readonly repo: Repository<AddressBookContact>,
  ) {}

  findAll(): Promise<AddressBookContact[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<AddressBookContact> {
    const contact = await this.repo.findOne({ where: { id } });
    if (!contact) throw new NotFoundException(`Contact ${id} not found`);
    return contact;
  }

  async create(dto: CreateAddressBookContactDto): Promise<AddressBookContact> {
    const existing = await this.repo.findOne({ where: { phone: dto.phone } });
    if (existing) {
      throw new ConflictException(`Phone number ${dto.phone} already exists`);
    }
    const contact = this.repo.create({
      fullName:    dto.fullName    ?? null,
      phone:       dto.phone,
      countryCode: dto.countryCode,
      country:     dto.country     ?? null,
      state:       dto.state       ?? null,
      city:        dto.city        ?? null,
      address:     dto.address     ?? null,
      note:        dto.note        ?? null,
    });
    return this.repo.save(contact);
  }

  async update(id: string, dto: UpdateAddressBookContactDto): Promise<AddressBookContact> {
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
      ...(dto.country     !== undefined && { country:     dto.country     ?? null }),
      ...(dto.state       !== undefined && { state:       dto.state       ?? null }),
      ...(dto.city        !== undefined && { city:        dto.city        ?? null }),
      ...(dto.address     !== undefined && { address:     dto.address     ?? null }),
      ...(dto.note        !== undefined && { note:        dto.note        ?? null }),
    });

    return this.repo.save(contact);
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
    dtos: CreateAddressBookContactDto[],
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
        country:     dto.country     ?? null,
        state:       dto.state       ?? null,
        city:        dto.city        ?? null,
        address:     dto.address     ?? null,
        note:        dto.note        ?? null,
      });
      await this.repo.save(contact);
      created++;
    }

    return { created, skipped };
  }
}
