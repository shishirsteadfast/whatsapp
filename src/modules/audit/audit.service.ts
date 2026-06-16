import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan } from 'typeorm';
import { AuditLog, AuditAction, AuditSeverity } from './entities/audit-log.entity';
import { User } from '../auth/entities/user.entity';

interface AuditContext {
  user?: User;
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
  limit?: number;
  offset?: number;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  async log(action: AuditAction, context: AuditContext = {}, severity: AuditSeverity = AuditSeverity.INFO): Promise<AuditLog> {
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
    const where: Record<string, unknown> = {};
    if (options.action) where.action = options.action;
    if (options.userId) where.userId = options.userId;
    if (options.sessionId) where.sessionId = options.sessionId;
    if (options.severity) where.severity = options.severity;
    if (options.startDate && options.endDate) {
      where.createdAt = Between(options.startDate, options.endDate);
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
