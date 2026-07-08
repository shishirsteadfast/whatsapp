export type SessionConnectivity = 'connected' | 'degraded' | 'unreachable' | 'not_connected';

export interface SessionHealth {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  connectivity: SessionConnectivity;
}

export interface MessageHealthResult {
  sessions: SessionHealth[];
  checkedAt: string;
}

export interface TestSendResult {
  messageId: string;
  timestamp: number;
  chatId: string;
}
