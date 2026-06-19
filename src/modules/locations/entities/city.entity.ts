import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { State } from './state.entity';

@Entity('cities')
export class City {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column()
  stateId: number;

  @ManyToOne(() => State, state => state.cities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stateId' })
  state: State;
}
