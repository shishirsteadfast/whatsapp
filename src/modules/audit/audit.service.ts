import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, LessThanOrEqual, MoreThanOrEqual, FindOptionsWhere, ILike } from 'typeorm';
import { AuditLog, AuditAction, AuditSeverity } from './entities/audit-log.entity';
import { User } from '../auth/entities/user.entity';

interface AuditContext {
  user?: Pick<User, 'id' | 'name'>;
  sessionId?: string;
  sessionName?: string;
  ipAddress?: string;
  userAgent?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  metadata?: Record<string, unknown>;
  errorMessage?: string;
}

export interface AuditQueryOptions {
  action?: AuditAction;
  userId?: string;
  sessionId?: string;
  severity?: AuditSeverity;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  async log(
    action: AuditAction,
    context: AuditContext = {},
    severity: AuditSeverity = AuditSeverity.INFO,
  ): Promise<AuditLog> {
    const auditLog = this.auditRepository.create({
      action,
      severity,
      userId: context.user?.id || null,
      userName: context.user?.name || null,
      sessionId: context.sessionId || null,
      sessionName: context.sessionName || null,
      ipAddress: context.ipAddress || null,
      userAgent: context.userAgent || null,
      method: context.method || null,
      path: context.path || null,
      statusCode: context.statusCode || null,
      metadata: context.metadata || null,
      errorMessage: context.errorMessage || null,
    });
    return this.auditRepository.save(auditLog);
  }

  async logInfo(action: AuditAction, context: AuditContext = {}): Promise<AuditLog> {
    return this.log(action, context, AuditSeverity.INFO);
  }

  async logWarn(action: AuditAction, context: AuditContext = {}): Promise<AuditLog> {
    return this.log(action, context, AuditSeverity.WARN);
  }

  async logError(action: AuditAction, context: AuditContext = {}): Promise<AuditLog> {
    return this.log(action, context, AuditSeverity.ERROR);
  }

  async findAll(options: AuditQueryOptions = {}): Promise<{ data: AuditLog[]; total: number }> {
    const baseWhere: FindOptionsWhere<AuditLog> = {};
    if (options.action) baseWhere.action = options.action;
    if (options.userId) baseWhere.userId = options.userId;
    if (options.sessionId) baseWhere.sessionId = options.sessionId;
    if (options.severity) baseWhere.severity = options.severity;
    if (options.startDate && options.endDate) {
      baseWhere.createdAt = Between(options.startDate, options.endDate);
    } else if (options.startDate) {
      baseWhere.createdAt = MoreThanOrEqual(options.startDate);
    } else if (options.endDate) {
      baseWhere.createdAt = LessThanOrEqual(options.endDate);
    }

    let where: FindOptionsWhere<AuditLog> | FindOptionsWhere<AuditLog>[] = baseWhere;
    if (options.search) {
      const term = ILike(`%${options.search}%`);
      const searchableFields: (keyof AuditLog)[] = ['action', 'userName', 'sessionName', 'errorMessage', 'path'];
      where = searchableFields.map(field => ({ ...baseWhere, [field]: term }));
    }

    const [data, total] = await this.auditRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: options.limit || 50,
      skip: options.offset || 0,
    });
    return { data, total };
  }

  async getRecentByUser(userId: string, limit = 10): Promise<AuditLog[]> {
    return this.auditRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getRecentBySession(sessionId: string, limit = 10): Promise<AuditLog[]> {
    return this.auditRepository.find({
      where: { sessionId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async cleanup(olderThanDays = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    const result = await this.auditRepository.delete({ createdAt: LessThan(cutoffDate) });
    return result.affected || 0;
  }
}
