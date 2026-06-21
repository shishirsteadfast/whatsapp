import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';
import { Contact } from '../contacts/contacts.entity';
import { CreateGroupDto, UpdateGroupDto, FilterContactsDto, BulkCreateWithGroupDto } from './dto/groups.dto';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepo: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly memberRepo: Repository<GroupMember>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
  ) {}

  async findAll(): Promise<(Group & { memberCount: number })[]> {
    const groups = await this.groupRepo.find({ order: { createdAt: 'DESC' } });

    if (groups.length === 0) return [];

    const counts = await this.memberRepo
      .createQueryBuilder('m')
      .select('m.groupId', 'groupId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('m.groupId')
      .getRawMany<{ groupId: string; count: string }>();

    const countMap = new Map<string, number>();
    for (const c of counts) {
      countMap.set(c.groupId, parseInt(c.count, 10));
    }

    return groups.map(g => ({
      ...g,
      memberCount: countMap.get(g.id) ?? 0,
    }));
  }

  async findOne(id: string): Promise<Group> {
    const group = await this.groupRepo.findOne({
      where: { id },
      relations: [
        'members',
        'members.contact',
        'members.contact.country',
        'members.contact.state',
        'members.contact.city',
      ],
    });
    if (!group) throw new NotFoundException(`Group ${id} not found`);
    return group;
  }

  async create(dto: CreateGroupDto): Promise<Group> {
    const existing = await this.groupRepo.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException(`Group name "${dto.name}" already exists`);
    }
    const group = this.groupRepo.create({
      name: dto.name,
      description: dto.description ?? null,
    });
    return this.groupRepo.save(group);
  }

  async update(id: string, dto: UpdateGroupDto): Promise<Group> {
    const group = await this.groupRepo.findOne({ where: { id } });
    if (!group) throw new NotFoundException(`Group ${id} not found`);

    if (dto.name && dto.name !== group.name) {
      const existing = await this.groupRepo.findOne({ where: { name: dto.name } });
      if (existing) {
        throw new ConflictException(`Group name "${dto.name}" already exists`);
      }
    }

    Object.assign(group, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description ?? null }),
    });

    return this.groupRepo.save(group);
  }

  async delete(id: string): Promise<void> {
    const group = await this.groupRepo.findOne({ where: { id } });
    if (!group) throw new NotFoundException(`Group ${id} not found`);
    await this.groupRepo.remove(group);
  }

  async addMembers(groupId: string, contactIds: string[]): Promise<{ added: number; alreadyExists: number }> {
    await this.findOne(groupId);

    let added = 0;
    let alreadyExists = 0;

    for (const contactId of contactIds) {
      const contact = await this.contactRepo.findOne({ where: { id: contactId } });
      if (!contact) continue;

      const existing = await this.memberRepo.findOne({
        where: { groupId, contactId },
      });
      if (existing) {
        alreadyExists++;
        continue;
      }

      const member = this.memberRepo.create({ groupId, contactId });
      await this.memberRepo.save(member);
      added++;
    }

    return { added, alreadyExists };
  }

  async removeMembers(groupId: string, contactIds: string[]): Promise<{ removed: number }> {
    await this.findOne(groupId);

    const result = await this.memberRepo.delete({
      groupId,
      contactId: In(contactIds),
    });

    return { removed: result.affected ?? 0 };
  }

  async filterContacts(filters: FilterContactsDto): Promise<Contact[]> {
    const qb = this.contactRepo
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.country', 'country')
      .leftJoinAndSelect('contact.state', 'state')
      .leftJoinAndSelect('contact.city', 'city');

    if (filters.countryId) {
      qb.andWhere('contact.countryId = :countryId', {
        countryId: filters.countryId,
      });
    }
    if (filters.stateId) {
      qb.andWhere('contact.stateId = :stateId', { stateId: filters.stateId });
    }
    if (filters.cityId) {
      qb.andWhere('contact.cityId = :cityId', { cityId: filters.cityId });
    }
    if (filters.name) {
      qb.andWhere('contact.fullName LIKE :name', { name: `%${filters.name}%` });
    }
    if (filters.phonePrefix) {
      qb.andWhere('contact.countryCode LIKE :prefix', {
        prefix: `%${filters.phonePrefix}%`,
      });
    }

    qb.orderBy('contact.fullName', 'ASC');
    qb.take(200);

    return qb.getMany();
  }

  async bulkCreateWithGroup(
    groupName: string,
    groupDescription: string | undefined,
    contacts: BulkCreateWithGroupDto['contacts'],
  ): Promise<{ group: Group; created: number; skipped: number }> {
    let group = await this.groupRepo.findOne({ where: { name: groupName } });
    if (!group) {
      group = this.groupRepo.create({
        name: groupName,
        description: groupDescription ?? null,
      });
      group = await this.groupRepo.save(group);
    }

    let created = 0;
    let skipped = 0;

    for (const dto of contacts) {
      const existing = await this.contactRepo.findOne({
        where: { phone: dto.phone },
      });
      if (existing) {
        skipped++;
        continue;
      }

      const contact = this.contactRepo.create({
        fullName: dto.fullName ?? null,
        phone: dto.phone,
        countryCode: dto.countryCode,
        countryId: dto.countryId ?? null,
        stateId: dto.stateId ?? null,
        cityId: dto.cityId ?? null,
        address: dto.address ?? null,
        note: dto.note ?? null,
      });
      const saved = await this.contactRepo.save(contact);

      const member = this.memberRepo.create({
        groupId: group.id,
        contactId: saved.id,
      });
      await this.memberRepo.save(member);
      created++;
    }

    return { group, created, skipped };
  }
}
