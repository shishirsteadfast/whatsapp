import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { State } from './state.entity';

@Entity('countries')
export class Country {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 2 })
  code: string; // ISO 3166-1 alpha-2, e.g. "MY"

  @Column({ type: 'varchar', length: 10 })
  dialCode: string; // e.g. "60" (without +)

  @Column({ type: 'varchar', length: 10, nullable: true })
  flag: string; // emoji, e.g. "🇲🇾"

  @Column({ type: 'varchar', length: 100, nullable: true })
  iso3: string; // ISO 3166-1 alpha-3, e.g. "MYS"

  @Column({ type: 'varchar', length: 100, nullable: true })
  capital: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  currency: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  region: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  subregion: string;

  @OneToMany(() => State, state => state.country)
  states: State[];
}
