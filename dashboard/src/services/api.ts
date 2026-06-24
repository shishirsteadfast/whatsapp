// API Service Layer for OpenWA Dashboard
const API_BASE_URL = '/api';

// =============================================================================
// Types
// =============================================================================

export interface Session {
  id: string;
  name: string;
  status: 'created' | 'idle' | 'initializing' | 'connecting' | 'qr_ready' | 'ready' | 'disconnected';
  phone?: string;
  pushName?: string;
  lastActive?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionStats {
  total: number;
  active: number;
  ready: number;
  disconnected: number;
  byStatus: Record<string, number>;
  memoryUsage: { heapUsed: number; heapTotal: number; rss: number };
}

export interface Webhook {
  id: string;
  sessionId: string;
  url: string;
  events: string[];
  active: boolean;
  secret?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  severity: 'info' | 'warn' | 'error';
  userId?: string;
  userName?: string;
  sessionId?: string;
  sessionName?: string;
  ipAddress?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  errorMessage?: string;
  createdAt: string;
}

export interface MessageResponse {
  messageId: string;
  timestamp: number;
}

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp?: string;
  details?: {
    database?: { status: string };
    redis?: { status: string };
    queue?: { status: string };
  };
}

export interface InfraStatus {
  database: { connected: boolean; type: string };
  redis: { connected: boolean; host: string; port: number };
  queue: {
    enabled: boolean;
    messageSend: { pending: number; completed: number; failed: number };
    messageBulk: { pending: number; completed: number; failed: number };
    webhooks: { pending: number; completed: number; failed: number };
  };
  storage: { type: 'local'; path: string };
  engine: { type: string; headless: boolean };
}

export interface Settings {
  general: { apiBaseUrl: string; sessionTimeout: number; autoReconnect: boolean; debugMode: boolean };
  api: { rateLimit: number; rateLimitWindow: number; enableDocs: boolean };
  notifications: { emailEnabled: boolean; notificationEmail: string; webhookAlerts: boolean };
}

// =============================================================================
// API Client
// =============================================================================

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('openwa_token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    localStorage.removeItem('openwa_token');
    // Dispatch a storage event so App.tsx cross-tab listener handles the logout
    // without triggering a reload loop
    window.dispatchEvent(new StorageEvent('storage', { key: 'openwa_token', newValue: null }));
    throw new Error('Session expired');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText })) as { message?: string };
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

// =============================================================================
// Session API
// =============================================================================

export const sessionApi = {
  list: () => request<Session[]>('/sessions'),
  get: (id: string) => request<Session>(`/sessions/${id}`),
  create: (name: string) => request<Session>('/sessions', { method: 'POST', body: JSON.stringify({ name }) }),
  delete: (id: string) => request<void>(`/sessions/${id}`, { method: 'DELETE' }),
  start: (id: string) => request<Session>(`/sessions/${id}/start`, { method: 'POST' }),
  stop: (id: string) => request<Session>(`/sessions/${id}/stop`, { method: 'POST' }),
  getQR: (id: string) => request<{ qrCode: string; status: string }>(`/sessions/${id}/qr`),
  getStats: () => request<SessionStats>('/sessions/stats/overview'),
  getGroups: (id: string) => request<{ id: string; name: string }[]>(`/sessions/${id}/groups`),
};

// =============================================================================
// Webhook API
// =============================================================================

export const webhookApi = {
  listBySession: (sessionId: string) => request<Webhook[]>(`/sessions/${sessionId}/webhooks`),
  listAll: () => request<Webhook[]>('/webhooks'),
  get: (sessionId: string, id: string) => request<Webhook>(`/sessions/${sessionId}/webhooks/${id}`),
  create: (sessionId: string, data: { url: string; events: string[] }) =>
    request<Webhook>(`/sessions/${sessionId}/webhooks`, { method: 'POST', body: JSON.stringify(data) }),
  update: (sessionId: string, id: string, data: Partial<Webhook>) =>
    request<Webhook>(`/sessions/${sessionId}/webhooks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (sessionId: string, id: string) =>
    request<void>(`/sessions/${sessionId}/webhooks/${id}`, { method: 'DELETE' }),
  test: (sessionId: string, id: string) =>
    request<{ success: boolean; statusCode?: number; error?: string }>(
      `/sessions/${sessionId}/webhooks/${id}/test`,
      { method: 'POST' },
    ),
};

// =============================================================================
// Audit/Logs API
// =============================================================================

export const auditApi = {
  list: (params?: { action?: string; severity?: string; userId?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.action) query.set('action', params.action);
    if (params?.severity) query.set('severity', params.severity);
    if (params?.userId) query.set('userId', params.userId);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const queryStr = query.toString();
    return request<{ data: AuditLog[]; total: number }>(`/audit${queryStr ? `?${queryStr}` : ''}`);
  },
};

// =============================================================================
// Message API
// =============================================================================

export const messageApi = {
  sendText: (sessionId: string, chatId: string, text: string) =>
    request<MessageResponse>(`/sessions/${sessionId}/messages/send-text`, {
      method: 'POST',
      body: JSON.stringify({ chatId, text }),
    }),
  sendImage: (sessionId: string, chatId: string, url: string, caption?: string) =>
    request<MessageResponse>(`/sessions/${sessionId}/messages/send-image`, {
      method: 'POST',
      body: JSON.stringify({ chatId, url, caption }),
    }),
  sendVideo: (sessionId: string, chatId: string, url: string, caption?: string) =>
    request<MessageResponse>(`/sessions/${sessionId}/messages/send-video`, {
      method: 'POST',
      body: JSON.stringify({ chatId, url, caption }),
    }),
  sendAudio: (sessionId: string, chatId: string, url: string) =>
    request<MessageResponse>(`/sessions/${sessionId}/messages/send-audio`, {
      method: 'POST',
      body: JSON.stringify({ chatId, url }),
    }),
  sendDocument: (sessionId: string, chatId: string, url: string, filename?: string) =>
    request<MessageResponse>(`/sessions/${sessionId}/messages/send-document`, {
      method: 'POST',
      body: JSON.stringify({ chatId, url, filename }),
    }),
  sendLocation: (sessionId: string, chatId: string, latitude: number, longitude: number, description?: string) =>
    request<MessageResponse>(`/sessions/${sessionId}/messages/send-location`, {
      method: 'POST',
      body: JSON.stringify({ chatId, latitude, longitude, description }),
    }),
  sendContact: (sessionId: string, chatId: string, contactName: string, contactNumber: string) =>
    request<MessageResponse>(`/sessions/${sessionId}/messages/send-contact`, {
      method: 'POST',
      body: JSON.stringify({ chatId, contactName, contactNumber }),
    }),
};

// =============================================================================
// Health & Infrastructure API
// =============================================================================

export const healthApi = {
  check: () => request<HealthStatus>('/health'),
  ready: () => request<HealthStatus>('/health/ready'),
};

export const infraApi = {
  getStatus: () => request<InfraStatus>('/infra/status'),
  saveConfig: (config: Record<string, unknown>) =>
    request<{ message: string; saved: boolean }>('/infra/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    }),
  restart: () =>
    request<{ message: string; restarting: boolean }>('/infra/restart', { method: 'POST' }),
  healthCheck: () => request<{ status: string; timestamp: string }>('/infra/health'),
};

// =============================================================================
// Settings API
// =============================================================================

export const settingsApi = {
  get: () => request<Settings>('/settings'),
  update: (settings: Partial<Settings>) =>
    request<Settings>('/settings', { method: 'PUT', body: JSON.stringify(settings) }),
};

// =============================================================================
// Plugin Types
// =============================================================================

export interface Plugin {
  id: string;
  name: string;
  version: string;
  type: 'engine' | 'storage' | 'queue' | 'auth' | 'extension';
  description?: string;
  author?: string;
  status: 'installed' | 'enabled' | 'disabled' | 'error';
  config: Record<string, unknown>;
  builtIn: boolean;
  provides: string[];
  loadedAt?: string;
  enabledAt?: string;
  error?: string;
}

export interface Engine {
  id: string;
  name: string;
  enabled: boolean;
  features: string[];
}

// =============================================================================
// Location Types & API
// =============================================================================

export interface CountryLocation {
  id: number;
  name: string;
  code: string;
  dialCode: string;
  flag: string;
  iso3: string;
  capital: string;
  currency: string;
  region: string;
  subregion: string;
}

export interface StateLocation {
  id: number;
  name: string;
  stateCode: string;
  countryId: number;
}

export interface CityLocation {
  id: number;
  name: string;
  stateId: number;
}

export const locationApi = {
  listCountries: () => request<CountryLocation[]>('/locations/countries'),
  listStates: (countryId: number) => request<StateLocation[]>(`/locations/countries/${countryId}/states`),
  listCities: (stateId: number) => request<CityLocation[]>(`/locations/states/${stateId}/cities`),
};

// =============================================================================
// Contact Types & API
// =============================================================================

export interface Contact {
  id: string;
  fullName?: string;
  phone: string;
  countryCode: string;
  countryId?: number;
  stateId?: number;
  cityId?: number;
  country?: CountryLocation;
  state?: StateLocation;
  city?: CityLocation;
  address?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactPayload {
  fullName?: string;
  phone: string;
  countryCode: string;
  countryId?: number;
  stateId?: number;
  cityId?: number;
  address?: string;
  note?: string;
}

export interface ContactMessage {
  id: string;
  sessionId: string;
  waMessageId?: string;
  chatId: string;
  from: string;
  to: string;
  body?: string;
  type: string;
  direction: 'incoming' | 'outgoing';
  timestamp?: number;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: string;
}

export const contactApi = {
  list: () => request<Contact[]>('/contacts'),
  create: (data: ContactPayload) =>
    request<Contact>('/contacts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<ContactPayload>) =>
    request<Contact>(`/contacts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/contacts/${id}`, { method: 'DELETE' }),
  bulkDelete: (ids: string[]) =>
    request<{ deleted: number }>('/contacts/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
  bulkCreate: (contacts: ContactPayload[]) =>
    request<{ created: number; skipped: number }>('/contacts/bulk', { method: 'POST', body: JSON.stringify({ contacts }) }),
  getMessages: (id: string, limit?: number, offset?: number) => {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    if (offset) params.set('offset', String(offset));
    const qs = params.toString();
    return request<{ messages: ContactMessage[]; total: number }>(
      `/contacts/${id}/messages${qs ? `?${qs}` : ''}`,
    );
  },
  exportAll: () =>
    request<Array<Contact & { totalSentMessages: number }>>('/contacts/export'),
};

export const pluginsApi = {
  list: () => request<Plugin[]>('/plugins'),
  get: (id: string) => request<Plugin>(`/plugins/${id}`),
  enable: (id: string) => request<{ success: boolean; message: string }>(`/plugins/${id}/enable`, { method: 'POST' }),
  disable: (id: string) => request<{ success: boolean; message: string }>(`/plugins/${id}/disable`, { method: 'POST' }),
  updateConfig: (id: string, config: Record<string, unknown>) =>
    request<{ success: boolean; message: string }>(`/plugins/${id}/config`, {
      method: 'PUT',
      body: JSON.stringify({ config }),
    }),
  healthCheck: (id: string) => request<{ healthy: boolean; message?: string }>(`/plugins/${id}/health`),
  getEngines: () => request<Engine[]>('/infra/engines'),
  getCurrentEngine: () => request<{ engineType: string }>('/infra/engines/current'),
};
