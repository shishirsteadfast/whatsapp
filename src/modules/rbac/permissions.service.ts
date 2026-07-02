import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { createLogger } from '../../common/services/logger.service';

export interface PermissionDefinition {
  name: string;
  group: string;
  description: string;
}

/**
 * All system permissions organized by group.
 * This is the single source of truth for what actions are controllable.
 */
export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // ── Users ──
  { name: 'users.create', group: 'users', description: 'Create new users' },
  { name: 'users.read', group: 'users', description: 'View user details and list' },
  { name: 'users.update', group: 'users', description: 'Update user details' },
  { name: 'users.delete', group: 'users', description: 'Delete users' },

  // ── Roles ──
  { name: 'roles.create', group: 'roles', description: 'Create new roles' },
  { name: 'roles.read', group: 'roles', description: 'View roles and permissions' },
  { name: 'roles.update', group: 'roles', description: 'Update roles and their permissions' },
  { name: 'roles.delete', group: 'roles', description: 'Delete roles' },

  // ── Sessions ──
  { name: 'sessions.create', group: 'sessions', description: 'Create WhatsApp sessions' },
  { name: 'sessions.read', group: 'sessions', description: 'View sessions' },
  { name: 'sessions.update', group: 'sessions', description: 'Start/stop sessions' },
  { name: 'sessions.delete', group: 'sessions', description: 'Delete sessions' },
  { name: 'sessions.qr', group: 'sessions', description: 'View QR codes' },
  { name: 'sessions.groups', group: 'sessions', description: 'View session groups' },
  { name: 'sessions.stats', group: 'sessions', description: 'View session statistics' },

  // ── Messages ──
  { name: 'messages.send', group: 'messages', description: 'Send messages' },
  { name: 'messages.read', group: 'messages', description: 'View message history' },
  { name: 'messages.bulk', group: 'messages', description: 'Send bulk messages' },

  // ── Webhooks ──
  { name: 'webhooks.create', group: 'webhooks', description: 'Create webhooks' },
  { name: 'webhooks.read', group: 'webhooks', description: 'View webhooks' },
  { name: 'webhooks.update', group: 'webhooks', description: 'Update webhooks' },
  { name: 'webhooks.delete', group: 'webhooks', description: 'Delete webhooks' },

  // ── Contacts ──
  { name: 'contacts.create', group: 'contacts', description: 'Create contacts' },
  { name: 'contacts.read', group: 'contacts', description: 'View contacts' },
  { name: 'contacts.update', group: 'contacts', description: 'Update contacts' },
  { name: 'contacts.delete', group: 'contacts', description: 'Delete contacts' },
  { name: 'contacts.bulk', group: 'contacts', description: 'Bulk import/export contacts' },

  // ── Contact Groups ──
  { name: 'groups.create', group: 'groups', description: 'Create contact groups' },
  { name: 'groups.read', group: 'groups', description: 'View contact groups' },
  { name: 'groups.update', group: 'groups', description: 'Update contact groups' },
  { name: 'groups.delete', group: 'groups', description: 'Delete contact groups' },

  // ── Campaigns ──
  { name: 'campaigns.create', group: 'campaigns', description: 'Create campaigns' },
  { name: 'campaigns.read', group: 'campaigns', description: 'View campaigns' },
  { name: 'campaigns.update', group: 'campaigns', description: 'Update campaigns' },
  { name: 'campaigns.delete', group: 'campaigns', description: 'Delete campaigns' },

  // ── API Keys ──
  { name: 'api_keys.create', group: 'api_keys', description: 'Create API keys' },
  { name: 'api_keys.read', group: 'api_keys', description: 'View API keys' },
  { name: 'api_keys.update', group: 'api_keys', description: 'Update API keys' },
  { name: 'api_keys.delete', group: 'api_keys', description: 'Delete API keys' },

  // ── Settings ──
  { name: 'settings.read', group: 'settings', description: 'View system settings' },
  { name: 'settings.update', group: 'settings', description: 'Update system settings' },

  // ── Audit ──
  { name: 'audit.read', group: 'audit', description: 'View audit logs' },

  // ── Locations ──
  { name: 'locations.read', group: 'locations', description: 'View location data' },

  // ── System ──
  { name: 'system.check', group: 'system', description: 'Run system health checks' },
  { name: 'system.monitor', group: 'system', description: 'Message health monitoring' },
];

/**
 * Default role assignments: which permission names each system role has.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ALL_PERMISSIONS.map(p => p.name),

  operator: [
    'sessions.create', 'sessions.read', 'sessions.update', 'sessions.delete',
    'sessions.qr', 'sessions.groups', 'sessions.stats',
    'messages.send', 'messages.read', 'messages.bulk',
    'webhooks.create', 'webhooks.read', 'webhooks.update', 'webhooks.delete',
    'contacts.create', 'contacts.read', 'contacts.update', 'contacts.delete', 'contacts.bulk',
    'groups.create', 'groups.read', 'groups.update', 'groups.delete',
    'campaigns.create', 'campaigns.read', 'campaigns.update', 'campaigns.delete',
    'api_keys.create', 'api_keys.read', 'api_keys.update', 'api_keys.delete',
    'settings.read',
    'audit.read',
    'locations.read',
    'system.check',
    'system.monitor',
  ],

  viewer: [
    'sessions.read', 'sessions.qr', 'sessions.groups', 'sessions.stats',
    'messages.read',
    'webhooks.read',
    'contacts.read',
    'groups.read',
    'campaigns.read',
    'api_keys.read',
    'settings.read',
    'audit.read',
    'locations.read',
    'system.check',
  ],
};

@Injectable()
export class PermissionsService implements OnModuleInit {
  private readonly logger = createLogger('PermissionsService');

  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedPermissions();
  }

  private async seedPermissions(): Promise<void> {
    const count = await this.permissionRepository.count();
    if (count > 0) {
      this.logger.log(`Permissions already seeded (${count} existing)`);
      return;
    }

    const entities = this.permissionRepository.create(
      ALL_PERMISSIONS.map(p => ({
        name: p.name,
        group: p.group,
        description: p.description,
      })),
    );
    await this.permissionRepository.save(entities);
    this.logger.log(`Seeded ${entities.length} permissions`);
  }

  async findAll(): Promise<Permission[]> {
    return this.permissionRepository.find({ order: { group: 'ASC', name: 'ASC' } });
  }

  async findByGroup(group: string): Promise<Permission[]> {
    return this.permissionRepository.find({
      where: { group },
      order: { name: 'ASC' },
    });
  }

  async findByIds(ids: string[]): Promise<Permission[]> {
    return this.permissionRepository.find({ where: ids.map(id => ({ id })) });
  }

  async findByName(name: string): Promise<Permission | null> {
    return this.permissionRepository.findOne({ where: { name } });
  }
}
