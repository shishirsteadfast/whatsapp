import { SessionStatus } from '../entities/session.entity';

export class SessionResponseDto {
  id: string;

  name: string;

  status: SessionStatus;

  phone?: string | null;

  pushName?: string | null;

  connectedAt?: Date | null;

  lastActive?: Date | null;

  createdAt: Date;

  updatedAt: Date;
}

export class QRCodeResponseDto {
  qrCode: string;

  status: SessionStatus;
}
