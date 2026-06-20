import { Entity, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { Contact } from '../../contacts/contacts.entity';
import { Group } from './group.entity';

@Entity('group_members')
export class GroupMember {
  @PrimaryColumn({ type: 'uuid' })
  contactId: string;

  @PrimaryColumn({ type: 'uuid' })
  groupId: string;

  @ManyToOne(() => Contact, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @ManyToOne(() => Group, group => group.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;
}
