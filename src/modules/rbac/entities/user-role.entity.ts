import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Role } from './role.entity';

@Entity('user_roles')
export class UserRoleAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  roleId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @CreateDateColumn()
  createdAt: Date;
}
