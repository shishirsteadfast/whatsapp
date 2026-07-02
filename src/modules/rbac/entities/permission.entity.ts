import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  group: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
