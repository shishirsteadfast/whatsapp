import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Country } from './country.entity';
import { City } from './city.entity';

@Entity('states')
export class State {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  stateCode: string; // e.g. "SGR" for Selangor

  @Column()
  countryId: number;

  @ManyToOne(() => Country, country => country.states, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'countryId' })
  country: Country;

  @OneToMany(() => City, city => city.state)
  cities: City[];
}
