import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Country } from '../locations/entities/country.entity';
import { State } from '../locations/entities/state.entity';
import { City } from '../locations/entities/city.entity';

@Entity('contacts')
export class AddressBookContact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  fullName: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ type: 'varchar', length: 10, default: '+60' })
  countryCode: string;

  @Column({ type: 'integer', nullable: true })
  countryId: number | null;

  @ManyToOne(() => Country, { nullable: true, eager: false })
  @JoinColumn({ name: 'countryId' })
  country: Country | null;

  @Column({ type: 'integer', nullable: true })
  stateId: number | null;

  @ManyToOne(() => State, { nullable: true, eager: false })
  @JoinColumn({ name: 'stateId' })
  state: State | null;

  @Column({ type: 'integer', nullable: true })
  cityId: number | null;

  @ManyToOne(() => City, { nullable: true, eager: false })
  @JoinColumn({ name: 'cityId' })
  city: City | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
