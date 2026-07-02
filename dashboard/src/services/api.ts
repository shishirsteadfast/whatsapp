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
  userAgent?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  metadata?: Record<string, unknown>;
  errorMessage?: string;
  createdAt: string;
}

export interface MessageResponse {
  messageId: string;
  timestamp: number;
}

export interface Message {
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

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp?: string;
  details?: {
    database?: { status: string };
    redis?: { status: string };
    queue?: { status: string };
  };
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

export interface AuditLogFilters {
  action?: string;
  severity?: string;
  userId?: string;
  sessionId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const auditApi = {
  list: (params?: AuditLogFilters) => {
    const query = new URLSearchParams();
    if (params?.action) query.set('action', params.action);
    if (params?.severity) query.set('severity', params.severity);
    if (params?.userId) query.set('userId', params.userId);
    if (params?.sessionId) query.set('sessionId', params.sessionId);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.search) query.set('search', params.search);
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
  list: (params?: {
    limit?: number;
    offset?: number;
    direction?: string;
    sessionId?: string;
    status?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    if (params?.direction) query.set('direction', params.direction);
    if (params?.sessionId) query.set('sessionId', params.sessionId);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString();
    return request<Message[]>(`/messages${qs ? `?${qs}` : ''}`);
  },
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
// Health API
// =============================================================================

export const healthApi = {
  check: () => request<HealthStatus>('/health'),
  ready: () => request<HealthStatus>('/health/ready'),
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
// Campaign Types & API
// =============================================================================

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  sessionId: string;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused' | 'cancelled' | 'failed';
  recipientType: 'contacts' | 'groups';
  recipientIds: string[];
  totalRecipients: number;
  messageContent: {
    type: string;
    text?: string;
    url?: string;
    caption?: string;
    filename?: string;
    latitude?: number;
    longitude?: number;
    contactName?: string;
    contactPhone?: string;
  };
  scheduleAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  sentCount: number;
  failedCount: number;
  currentIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignRecipient {
  id: string;
  campaignId: string;
  chatId: string;
  recipientName: string;
  contactId?: string;
  groupId?: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  messageId?: string;
  errorMessage?: string;
  sentAt?: string;
  createdAt: string;
}

export interface CampaignStats {
  total: number;
  draft: number;
  scheduled: number;
  sending: number;
  completed: number;
  failed: number;
  paused: number;
  cancelled: number;
  totalRecipients: number;
  totalSent: number;
  totalFailed: number;
}

export interface CampaignPayload {
  name: string;
  description?: string;
  sessionId: string;
  recipientType: 'contacts' | 'groups';
  recipientIds: string[];
  messageContent: Campaign['messageContent'];
  scheduleAt?: string;
}

export interface CampaignUpdatePayload {
  name?: string;
  description?: string;
  messageContent?: Campaign['messageContent'];
  scheduleAt?: string;
}

export const campaignApi = {
  list: (params?: { status?: string; search?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return request<{ campaigns: Campaign[]; total: number }>(`/campaigns${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => request<Campaign>(`/campaigns/${id}`),
  create: (data: CampaignPayload) =>
    request<Campaign>('/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: CampaignUpdatePayload) =>
    request<Campaign>(`/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/campaigns/${id}`, { method: 'DELETE' }),
  start: (id: string) =>
    request<Campaign>(`/campaigns/${id}/start`, { method: 'POST' }),
  pause: (id: string) =>
    request<Campaign>(`/campaigns/${id}/pause`, { method: 'POST' }),
  cancel: (id: string) =>
    request<Campaign>(`/campaigns/${id}/cancel`, { method: 'POST' }),
  resendFailed: (id: string) =>
    request<Campaign>(`/campaigns/${id}/resend-failed`, { method: 'POST' }),
  getRecipients: (id: string, params?: { status?: string; search?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return request<{ recipients: CampaignRecipient[]; total: number }>(`/campaigns/${id}/recipients${qs ? `?${qs}` : ''}`);
  },
  getStats: () => request<CampaignStats>('/campaigns/stats'),
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

// =============================================================================
// Contact Group Types & API
// =============================================================================

export interface ContactGroup {
  id: string;
  name: string;
  description?: string;
  memberCount?: number;
  members?: Array<{
    contactId: string;
    groupId: string;
    contact: Contact;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ContactGroupPayload {
  name: string;
  description?: string;
}

export interface FilterParams {
  countryId?: number;
  stateId?: number;
  cityId?: number;
  name?: string;
  phonePrefix?: string;
}

export const groupApi = {
  list: () => request<ContactGroup[]>('/groups'),
  get: (id: string) => request<ContactGroup>(`/groups/${id}`),
  create: (data: ContactGroupPayload) =>
    request<ContactGroup>('/groups', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<ContactGroupPayload>) =>
    request<ContactGroup>(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/groups/${id}`, { method: 'DELETE' }),
  addMembers: (id: string, contactIds: string[]) =>
    request<{ added: number; alreadyExists: number }>(`/groups/${id}/members`, {
      method: 'POST',
      body: JSON.stringify({ contactIds }),
    }),
  removeMembers: (id: string, contactIds: string[]) =>
    request<{ removed: number }>(`/groups/${id}/members`, {
      method: 'DELETE',
      body: JSON.stringify({ contactIds }),
    }),
  filterContacts: (filters: FilterParams) => {
    const params = new URLSearchParams();
    if (filters.countryId) params.set('countryId', String(filters.countryId));
    if (filters.stateId) params.set('stateId', String(filters.stateId));
    if (filters.cityId) params.set('cityId', String(filters.cityId));
    if (filters.name) params.set('name', filters.name);
    if (filters.phonePrefix) params.set('phonePrefix', filters.phonePrefix);
    const qs = params.toString();
    return request<Contact[]>(`/groups/contacts/filter${qs ? `?${qs}` : ''}`);
  },
  bulkCreateWithGroup: (data: {
    name: string;
    description?: string;
    contacts: ContactPayload[];
  }) =>
    request<{ group: ContactGroup; created: number; skipped: number }>(
      '/groups/bulk-create-with-group',
      { method: 'POST', body: JSON.stringify(data) },
    ),
};

// =============================================================================
// Auth API (Profile & Password)
// =============================================================================

export interface UserProfile {
  id: string;
  phone: string;
  name: string;
  profilePic?: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSettingsData {
  id: string;
  businessLogo?: string;
  smallLogo?: string;
  email?: string;
  altPhone?: string;
  website?: string;
  name?: string;
  address?: string;
  googleMapLink?: string;
  updatedAt: string;
}

export const authApi = {
  me: () => request<UserProfile>('/auth/me'),
  updateProfile: (data: { name?: string; phone?: string; profilePic?: string }) =>
    request<UserProfile>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ success: boolean }>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

export const systemSettingsApi = {
  get: () => request<SystemSettingsData>('/system-settings'),
  update: (data: Partial<SystemSettingsData>) =>
    request<SystemSettingsData>('/system-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// =============================================================================
// System Check Types & API
// =============================================================================

export type SystemCheckStatus = 'ok' | 'fail';

export interface SystemCheckItem {
  key: string;
  status: SystemCheckStatus;
  detail?: string;
}

export interface SystemCheckResult {
  checks: SystemCheckItem[];
  hasIssues: boolean;
  checkedAt: string;
}

export const systemCheckApi = {
  get: () => request<SystemCheckResult>('/system-check'),
};

// =============================================================================
// Message Health Types & API
// =============================================================================

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

export const messageHealthApi = {
  get: () => request<MessageHealthResult>('/message-health'),
  testSend: (sessionId: string) =>
    request<TestSendResult>('/message-health/test-send', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    }),
};

// =============================================================================
// Upload API
// =============================================================================

// =============================================================================
// API Key Types & API
// =============================================================================

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  role: string;
  isActive: boolean;
  lastUsedAt: string | null;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyPayload {
  name: string;
  role: string;
}

export interface ApiKeyWithSecret {
  apiKey: string;
  data: ApiKey;
}

export interface ApiKeyStats {
  totalKeys: number;
  activeKeys: number;
  revokedKeys: number;
  totalCalls: number;
  callsToday: number;
  callsThisMonth: number;
  topEndpoints: Array<{ path: string; method: string; count: number }>;
}

export const apiKeysApi = {
  list: () => request<ApiKey[]>('/api-keys'),
  create: (data: CreateApiKeyPayload) => request<ApiKeyWithSecret>('/api-keys', { method: 'POST', body: JSON.stringify(data) }),
  revoke: (id: string) => request<{ success: boolean }>(`/api-keys/${id}/revoke`, { method: 'POST' }),
  delete: (id: string) => request<void>(`/api-keys/${id}`, { method: 'DELETE' }),
  getStats: () => request<ApiKeyStats>('/api-keys/stats'),
};

export const uploadApi = {
  upload: async (folder: string, file: File): Promise<{ url: string; filename: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('openwa_token');
    const response = await fetch(`/api/upload/${folder}`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `Upload failed`);
    }
    return response.json();
  },
};
