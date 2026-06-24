import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  Plus,
  Copy,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  X,
  Check,
  KeyRound,
  AlertTriangle,
  Globe,
  BookOpen,
  Activity,
  Code2,
  Terminal,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Server,
  Shield,
  BarChart3,
  List,
} from 'lucide-react';
import type { ApiKey } from '../services/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import {
  useApiKeysQuery,
  useApiKeyStatsQuery,
  useCreateApiKeyMutation,
  useDeleteApiKeyMutation,
  useRevokeApiKeyMutation,
} from '../hooks/queries';
import { PageHeader } from '../components/PageHeader';

const roleNames = ['admin', 'operator', 'viewer'] as const;

// ── API Documentation data ──────────────────────────────────────────────

interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  auth: string;
  body?: string;
  curlExample: string;
  responseExample: string;
}

const apiEndpoints: ApiEndpoint[] = [
  {
    method: 'GET',
    path: '/api/health',
    description: 'apiDocs.endpoints.health.desc',
    auth: 'apiDocs.auth.none',
    curlExample: "curl {{baseUrl}}/health",
    responseExample: '{\n  "status": "ok",\n  "timestamp": "2025-01-01T00:00:00.000Z"\n}',
  },
  {
    method: 'GET',
    path: '/api/sessions',
    description: 'apiDocs.endpoints.sessions.list',
    auth: 'apiDocs.auth.apiKey',
    curlExample: "curl -H \"X-API-Key: {{apiKey}}\" {{baseUrl}}/sessions",
    responseExample: '[\n  {\n    "id": "session-id",\n    "name": "my-session",\n    "status": "ready",\n    "phone": "1234567890",\n    "createdAt": "2025-01-01T00:00:00.000Z"\n  }\n]',
  },
  {
    method: 'POST',
    path: '/api/sessions',
    description: 'apiDocs.endpoints.sessions.create',
    auth: 'apiDocs.auth.apiKey',
    body: '{\n  "name": "my-session"\n}',
    curlExample: "curl -X POST -H \"X-API-Key: {{apiKey}}\" -H \"Content-Type: application/json\" -d '{\"name\":\"my-session\"}' {{baseUrl}}/sessions",
    responseExample: '{\n  "id": "session-id",\n  "name": "my-session",\n  "status": "created",\n  "createdAt": "2025-01-01T00:00:00.000Z"\n}',
  },
  {
    method: 'GET',
    path: '/api/sessions/:id/qr',
    description: 'apiDocs.endpoints.sessions.qr',
    auth: 'apiDocs.auth.apiKey',
    curlExample: "curl -H \"X-API-Key: {{apiKey}}\" {{baseUrl}}/sessions/{sessionId}/qr",
    responseExample: '{\n  "qrCode": "base64-encoded-qr-image",\n  "status": "qr_ready"\n}',
  },
  {
    method: 'DELETE',
    path: '/api/sessions/:id',
    description: 'apiDocs.endpoints.sessions.delete',
    auth: 'apiDocs.auth.apiKey',
    curlExample: "curl -X DELETE -H \"X-API-Key: {{apiKey}}\" {{baseUrl}}/sessions/{sessionId}",
    responseExample: '{\n  "success": true\n}',
  },
  {
    method: 'POST',
    path: '/api/sessions/:id/messages/send-text',
    description: 'apiDocs.endpoints.messages.sendText',
    auth: 'apiDocs.auth.apiKey',
    body: '{\n  "chatId": "1234567890@c.us",\n  "text": "Hello, World!"\n}',
    curlExample: "curl -X POST -H \"X-API-Key: {{apiKey}}\" -H \"Content-Type: application/json\" -d '{\"chatId\":\"1234567890@c.us\",\"text\":\"Hello, World!\"}' {{baseUrl}}/sessions/{sessionId}/messages/send-text",
    responseExample: '{\n  "messageId": "msg-id",\n  "timestamp": 1735689600\n}',
  },
  {
    method: 'POST',
    path: '/api/sessions/:id/messages/send-image',
    description: 'apiDocs.endpoints.messages.sendImage',
    auth: 'apiDocs.auth.apiKey',
    body: '{\n  "chatId": "1234567890@c.us",\n  "url": "https://example.com/image.jpg",\n  "caption": "Optional caption"\n}',
    curlExample: "curl -X POST -H \"X-API-Key: {{apiKey}}\" -H \"Content-Type: application/json\" -d '{\"chatId\":\"1234567890@c.us\",\"url\":\"https://example.com/image.jpg\"}' {{baseUrl}}/sessions/{sessionId}/messages/send-image",
    responseExample: '{\n  "messageId": "msg-id",\n  "timestamp": 1735689600\n}',
  },
  {
    method: 'POST',
    path: '/api/sessions/:id/messages/send-location',
    description: 'apiDocs.endpoints.messages.sendLocation',
    auth: 'apiDocs.auth.apiKey',
    body: '{\n  "chatId": "1234567890@c.us",\n  "latitude": -6.2088,\n  "longitude": 106.8456,\n  "description": "Meeting point"\n}',
    curlExample: "curl -X POST -H \"X-API-Key: {{apiKey}}\" -H \"Content-Type: application/json\" -d '{\"chatId\":\"1234567890@c.us\",\"latitude\":-6.2088,\"longitude\":106.8456}' {{baseUrl}}/sessions/{sessionId}/messages/send-location",
    responseExample: '{\n  "messageId": "msg-id",\n  "timestamp": 1735689600\n}',
  },
  {
    method: 'GET',
    path: '/api/messages',
    description: 'apiDocs.endpoints.messages.list',
    auth: 'apiDocs.auth.apiKey',
    curlExample: "curl -H \"X-API-Key: {{apiKey}}\" {{baseUrl}}/messages?limit=50&offset=0",
    responseExample: '[\n  {\n    "id": "msg-id",\n    "sessionId": "session-id",\n    "chatId": "1234567890@c.us",\n    "body": "Hello",\n    "direction": "outgoing",\n    "status": "sent",\n    "createdAt": "2025-01-01T00:00:00.000Z"\n  }\n]',
  },
  {
    method: 'GET',
    path: '/api/contacts',
    description: 'apiDocs.endpoints.contacts.list',
    auth: 'apiDocs.auth.apiKey',
    curlExample: "curl -H \"X-API-Key: {{apiKey}}\" {{baseUrl}}/contacts",
    responseExample: '[\n  {\n    "id": "contact-id",\n    "fullName": "John Doe",\n    "phone": "1234567890",\n    "countryCode": "+1",\n    "createdAt": "2025-01-01T00:00:00.000Z"\n  }\n]',
  },
  {
    method: 'POST',
    path: '/api/contacts',
    description: 'apiDocs.endpoints.contacts.create',
    auth: 'apiDocs.auth.apiKey',
    body: '{\n  "fullName": "John Doe",\n  "phone": "1234567890",\n  "countryCode": "+1"\n}',
    curlExample: "curl -X POST -H \"X-API-Key: {{apiKey}}\" -H \"Content-Type: application/json\" -d '{\"fullName\":\"John Doe\",\"phone\":\"1234567890\",\"countryCode\":\"+1\"}' {{baseUrl}}/contacts",
    responseExample: '{\n  "id": "contact-id",\n  "fullName": "John Doe",\n  "phone": "1234567890",\n  "countryCode": "+1",\n  "createdAt": "2025-01-01T00:00:00.000Z"\n}',
  },
  {
    method: 'GET',
    path: '/api/webhooks',
    description: 'apiDocs.endpoints.webhooks.list',
    auth: 'apiDocs.auth.apiKey',
    curlExample: "curl -H \"X-API-Key: {{apiKey}}\" {{baseUrl}}/webhooks",
    responseExample: '[\n  {\n    "id": "webhook-id",\n    "sessionId": "session-id",\n    "url": "https://example.com/webhook",\n    "events": ["message.received", "message.sent"],\n    "active": true\n  }\n]',
  },
  {
    method: 'GET',
    path: '/api/campaigns',
    description: 'apiDocs.endpoints.campaigns.list',
    auth: 'apiDocs.auth.apiKey',
    curlExample: "curl -H \"X-API-Key: {{apiKey}}\" {{baseUrl}}/campaigns",
    responseExample: '{\n  "campaigns": [\n    {\n      "id": "campaign-id",\n      "name": "Holiday Promotion",\n      "status": "completed",\n      "sentCount": 100,\n      "failedCount": 2\n    }\n  ],\n  "total": 1\n}',
  },
  {
    method: 'POST',
    path: '/api/campaigns',
    description: 'apiDocs.endpoints.campaigns.create',
    auth: 'apiDocs.auth.apiKey',
    body: '{\n  "name": "Holiday Promotion",\n  "sessionId": "session-id",\n  "recipientType": "contacts",\n  "recipientIds": ["contact-id-1", "contact-id-2"],\n  "messageContent": {\n    "type": "text",\n    "text": "Check out our holiday deals!"\n  }\n}',
    curlExample: "curl -X POST -H \"X-API-Key: {{apiKey}}\" -H \"Content-Type: application/json\" -d '{\"name\":\"Holiday Promotion\",\"sessionId\":\"session-id\",\"recipientType\":\"contacts\",\"recipientIds\":[\"contact-id-1\"],\"messageContent\":{\"type\":\"text\",\"text\":\"Hello!\"}}' {{baseUrl}}/campaigns",
    responseExample: '{\n  "id": "campaign-id",\n  "name": "Holiday Promotion",\n  "status": "draft",\n  "createdAt": "2025-01-01T00:00:00.000Z"\n}',
  },
  {
    method: 'GET',
    path: '/api/settings',
    description: 'apiDocs.endpoints.settings.get',
    auth: 'apiDocs.auth.admin',
    curlExample: "curl -H \"X-API-Key: {{apiKey}}\" {{baseUrl}}/settings",
    responseExample: '{\n  "general": {\n    "apiBaseUrl": "https://api.example.com",\n    "sessionTimeout": 86400000,\n    "autoReconnect": true\n  },\n  "api": {\n    "rateLimit": 100,\n    "rateLimitWindow": 60,\n    "enableDocs": true\n  }\n}',
  },
];

const apiMethodColors: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  PATCH: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
};

// ── Helper hook ─────────────────────────────────────────────────────────

function useWindowSize() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return width;
}

// ── Column helper ───────────────────────────────────────────────────────

const columnHelper = createColumnHelper<ApiKey>();

// ── Tab type ────────────────────────────────────────────────────────────

type Tab = 'overview' | 'keys' | 'docs';

// ── Component ───────────────────────────────────────────────────────────

export function ApiKeys() {
  const { t } = useTranslation();
  useDocumentTitle(t('apiKeys.title'));

  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <div className="w-full p-8 max-sm:p-4">
      <PageHeader
        title={t('apiKeys.title')}
        subtitle={t('apiKeys.subtitle')}
      />

      {/* ── Tabs ── */}
      <div className="mb-7 flex gap-1 rounded-xl border border-border bg-surface p-1 shadow-xs">
        {([
          { id: 'overview' as Tab, icon: BarChart3, label: t('apiKeys.tabs.overview') },
          { id: 'keys' as Tab,     icon: KeyRound,   label: t('apiKeys.tabs.keys') },
          { id: 'docs' as Tab,     icon: BookOpen,   label: t('apiKeys.tabs.docs') },
        ]).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border-none px-4 py-2.5 text-sm font-semibold transition-all ${
              activeTab === id
                ? 'bg-primary text-white shadow-sm'
                : 'bg-transparent text-ink-secondary hover:bg-muted hover:text-ink'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'keys' && <ApiKeysTab />}
      {activeTab === 'docs' && <ApiDocsTab />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Overview Tab
// ═══════════════════════════════════════════════════════════════════════

function OverviewTab() {
  const { t } = useTranslation();
  const { data: apiKeys = [], isLoading: loading } = useApiKeysQuery();
  const { data: stats } = useApiKeyStatsQuery();
  const [copied, setCopied] = useState<string | null>(null);

  const baseUrl = window.location.origin + '/api';
  const activeKeys = apiKeys.filter(k => k.isActive);
  const totalCalls = apiKeys.reduce((sum, k) => sum + (k.usageCount || 0), 0);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const statCards = [
    { icon: KeyRound,    label: t('apiKeys.stats.totalKeys'),    value: apiKeys.length.toString(),     color: 'text-primary' },
    { icon: Shield,      label: t('apiKeys.stats.activeKeys'),   value: activeKeys.length.toString(),  color: 'text-emerald-500' },
    { icon: Activity,    label: t('apiKeys.stats.totalCalls'),   value: totalCalls.toLocaleString(),   color: 'text-blue-500' },
    { icon: Server,      label: t('apiKeys.stats.rateLimit'),    value: stats?.callsToday?.toLocaleString() ?? '-', color: 'text-amber-500' },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[300px] w-full items-center justify-center">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {statCards.map(({ icon: Icon, label, value, color }) => (
          <div
            key={label}
            className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-5 shadow-xs transition-all hover:shadow-md"
          >
            <div className="flex items-center gap-2.5">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color} bg-current/10`}>
                <Icon size={18} className={color} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-ink">{value}</span>
          </div>
        ))}
      </div>

      {/* Base URL */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Globe size={17} className="text-primary" />
          </div>
          <h3 className="m-0 text-base font-semibold text-ink">{t('apiKeys.credentials.baseUrl')}</h3>
        </div>
        <p className="mb-3 text-sm text-ink-muted">{t('apiKeys.credentials.baseUrlHint')}</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 break-all rounded-lg border border-border bg-muted px-4 py-3 font-mono text-sm text-ink">
            {baseUrl}
          </code>
          <button
            className="icon-btn"
            onClick={() => copyToClipboard(baseUrl, 'base-url')}
            title={t('common.copy') as string}
          >
            {copied === 'base-url' ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      {/* Quick Links */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 size={17} className="text-primary" />
          </div>
          <h3 className="m-0 text-base font-semibold text-ink">{t('apiKeys.quickLinks.title')}</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { label: t('apiKeys.quickLinks.manageKeys'), desc: t('apiKeys.quickLinks.manageKeysDesc') },
            { label: t('apiKeys.quickLinks.viewDocs'),  desc: t('apiKeys.quickLinks.viewDocsDesc') },
            { label: t('apiKeys.quickLinks.createKey'), desc: t('apiKeys.quickLinks.createKeyDesc') },
          ].map(({ label, desc }) => (
            <div
              key={label}
              className="flex flex-1 flex-col gap-1.5 rounded-lg border border-border bg-muted p-4 min-w-[200px] transition-all hover:border-primary/30 hover:bg-primary/5"
            >
              <span className="text-sm font-semibold text-ink">{label}</span>
              <span className="text-xs text-ink-muted">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  API Keys Tab
// ═══════════════════════════════════════════════════════════════════════

function ApiKeysTab() {
  const { t } = useTranslation();
  const { data: apiKeys = [], isLoading: loading } = useApiKeysQuery();
  const createMutation = useCreateApiKeyMutation();
  const deleteMutation = useDeleteApiKeyMutation();
  const revokeMutation = useRevokeApiKeyMutation();
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [newKey, setNewKey] = useState({ name: '', role: 'operator' });
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'revoke'; id: string; name: string } | null>(null);

  const windowWidth = useWindowSize();
  const isMobile = windowWidth < 768;
  const isSmall = windowWidth < 640;
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  useEffect(() => {
    setColumnVisibility({ key: !isSmall, lastUsed: !isMobile });
  }, [isMobile, isSmall]);

  const handleCreate = async () => {
    if (!newKey.name) return;
    try {
      const created = await createMutation.mutateAsync({ name: newKey.name, role: newKey.role });
      setCreatedKey(created.apiKey || null);
      setNewKey({ name: '', role: 'operator' });
    } catch (err) {
      console.error('Failed to create:', err);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeMutation.mutateAsync(id);
    } catch (err) {
      console.error('Failed to revoke:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const confirmAndExecute = () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'delete') handleDelete(confirmAction.id);
    else handleRevoke(confirmAction.id);
    setConfirmAction(null);
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: () => t('apiKeys.columns.name'),
        cell: info => <span className="font-medium text-ink">{info.getValue()}</span>,
      }),
      columnHelper.accessor('keyPrefix', {
        id: 'key',
        header: () => t('apiKeys.columns.key'),
        cell: info => {
          const apiKey = info.row.original;
          return (
            <span className="flex items-center gap-2">
              <code className="whitespace-nowrap rounded-md bg-muted px-[0.625rem] py-[0.375rem] font-mono text-xs text-ink-secondary">
                {visibleKeys.has(apiKey.id) ? apiKey.keyPrefix + '...' : apiKey.keyPrefix + '****'}
              </code>
              <button
                className="flex shrink-0 cursor-pointer items-center justify-center border-none bg-transparent p-1 text-ink-muted transition-colors hover:text-ink"
                onClick={() => toggleKeyVisibility(apiKey.id)}
              >
                {visibleKeys.has(apiKey.id) ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </span>
          );
        },
      }),
      columnHelper.accessor('role', {
        header: () => t('apiKeys.columns.role'),
        cell: info => (
          <span className="whitespace-nowrap rounded-md bg-sky-100 px-2 py-1 text-[0.6875rem] font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('isActive', {
        header: () => t('apiKeys.columns.status'),
        cell: info => (
          <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
            info.getValue() ? 'bg-primary/10 text-primary' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {info.getValue() ? t('apiKeys.statuses.active') : t('apiKeys.statuses.revoked')}
          </span>
        ),
      }),
      columnHelper.accessor('lastUsedAt', {
        id: 'lastUsed',
        header: () => t('apiKeys.columns.lastUsed'),
        cell: info => (
          <span className="text-sm text-ink-secondary">
            {info.getValue() ? new Date(info.getValue()!).toLocaleDateString() : t('common.never')}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: () => t('apiKeys.columns.actions'),
        cell: info => {
          const apiKey = info.row.original;
          return (
            <span className="flex justify-end gap-1">
              <button
                className="flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-transparent p-2 text-ink-secondary transition-all hover:bg-muted hover:text-ink"
                onClick={() => copyToClipboard(apiKey.keyPrefix, apiKey.id)}
                title={t('apiKeys.actions.copy')}
              >
                {copied === apiKey.id ? <Check size={16} /> : <Copy size={16} />}
              </button>
              {apiKey.isActive && (
                <button
                  className="flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-transparent p-2 text-ink-secondary transition-all hover:bg-muted hover:text-ink"
                  onClick={() => setConfirmAction({ type: 'revoke', id: apiKey.id, name: apiKey.name })}
                  title={t('apiKeys.actions.revoke')}
                >
                  <RefreshCw size={16} />
                </button>
              )}
              <button
                className="flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-transparent p-2 text-ink-secondary transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                onClick={() => setConfirmAction({ type: 'delete', id: apiKey.id, name: apiKey.name })}
                title={t('apiKeys.actions.delete')}
              >
                <Trash2 size={16} />
              </button>
            </span>
          );
        },
      }),
    ],
    [visibleKeys, copied, t],
  );

  const table = useReactTable({
    data: apiKeys,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading) {
    return (
      <div className="flex min-h-[400px] w-full items-center justify-center p-8">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Create Button */}
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          {t('apiKeys.createBtn')}
        </button>
      </div>

      {/* Keys Table */}
      <div className="w-full overflow-x-auto rounded-xl border border-border bg-surface shadow-xs">
        {apiKeys.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-8 py-16 text-center text-ink-muted">
            <KeyRound size={48} strokeWidth={1} className="mb-4 text-ink-muted opacity-40" />
            <h3 className="m-0 mb-2 text-lg font-semibold text-ink-secondary">{t('apiKeys.empty.title')}</h3>
            <p className="m-0 max-w-[300px] text-sm">{t('apiKeys.empty.description')}</p>
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} className="border-b border-border bg-muted">
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="px-6 py-[1.125rem] text-left text-[0.7rem] font-bold uppercase tracking-[0.05em] text-ink-secondary">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`border-b border-border last:border-b-0 ${
                    idx % 2 === 1 ? 'bg-black/[0.02] dark:bg-white/[0.02]' : ''
                  } hover:bg-primary/5`}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-6 py-[1.125rem] align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Roles Reference */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
        <h3 className="mb-4 text-lg font-semibold text-ink">{t('apiKeys.rolesTitle')}</h3>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
          {roleNames.map(r => (
            <div key={r} className="flex flex-col gap-1 rounded-(--radius) bg-muted p-3">
              <code className="w-fit rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">{r}</code>
              <span className="text-xs text-ink-secondary">{t(`apiKeys.roleDescriptions.${r}`)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Create/Reveal Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease]"
          onClick={() => {
            setShowModal(false);
            setCreatedKey(null);
          }}
        >
          <div className="w-[90%] max-w-[480px] animate-[slideUp_0.3s_ease] overflow-hidden rounded-2xl bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 pb-4 pt-6">
              <h2 className="m-0 text-xl font-bold text-ink">
                {createdKey ? t('apiKeys.createdTitle') : t('apiKeys.modalTitle')}
              </h2>
              <button
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-all hover:bg-muted hover:text-ink"
                onClick={() => {
                  setShowModal(false);
                  setCreatedKey(null);
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-6">
              {createdKey ? (
                <div>
                  <p className="mb-4 text-sm text-ink-muted">{t('apiKeys.createdHint')}</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 break-all rounded-md bg-muted px-3 py-3 text-sm">{createdKey}</code>
                    <button className="btn-primary" onClick={() => copyToClipboard(createdKey, 'modal')}>
                      {copied === 'modal' ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                  <p className="mt-4 text-xs text-ink-muted">{t('apiKeys.createdHintExtra')}</p>
                </div>
              ) : (
                <>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-ink-secondary">{t('common.name')}</label>
                  <input
                    type="text"
                    placeholder={t('apiKeys.namePlaceholder')}
                    className="mb-5 w-full rounded-(--radius) border border-border bg-surface px-4 py-3 text-[0.9375rem] text-ink transition-all focus:border-primary focus:outline-none"
                    value={newKey.name}
                    onChange={e => setNewKey({ ...newKey, name: e.target.value })}
                  />
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-ink-secondary">{t('common.role')}</label>
                  <select
                    className="w-full rounded-(--radius) border border-border bg-surface px-4 py-3 text-[0.9375rem] text-ink transition-all focus:border-primary focus:outline-none"
                    value={newKey.role}
                    onChange={e => setNewKey({ ...newKey, role: e.target.value })}
                  >
                    {roleNames.map(r => (
                      <option key={r} value={r}>{t(`apiKeys.roles.${r}`)}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
            {!createdKey && (
              <div className="flex justify-end gap-3 px-6 pb-6">
                <button className="btn-secondary" onClick={() => { setShowModal(false); setCreatedKey(null); }}>{t('common.cancel')}</button>
                <button className="btn-primary" onClick={handleCreate}>{t('common.create')}</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm Action Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease]" onClick={() => setConfirmAction(null)}>
          <div className="w-[90%] max-w-[400px] animate-[slideUp_0.3s_ease] overflow-hidden rounded-2xl bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 pb-4 pt-6">
              <h2 className="m-0 text-xl font-bold text-ink">
                {confirmAction.type === 'delete' ? t('apiKeys.confirm.deleteTitle') : t('apiKeys.confirm.revokeTitle')}
              </h2>
              <button className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-all hover:bg-muted hover:text-ink" onClick={() => setConfirmAction(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-6">
              <div className="mb-4 flex justify-center">
                <AlertTriangle size={48} className="text-amber-500" />
              </div>
              <p className="m-0 text-center text-[0.9375rem] leading-relaxed text-ink-secondary">
                <Trans
                  i18nKey={confirmAction.type === 'delete' ? 'apiKeys.confirm.deleteMessage' : 'apiKeys.confirm.revokeMessage'}
                  values={{ name: confirmAction.name }}
                  components={{ strong: <strong className="text-ink" /> }}
                />
              </p>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button className="btn-secondary" onClick={() => setConfirmAction(null)}>{t('common.cancel')}</button>
              <button className="btn-danger" onClick={confirmAndExecute}>
                {confirmAction.type === 'delete' ? t('apiKeys.confirm.delete') : t('apiKeys.confirm.revoke')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Tooltip & HoverCard Components
// ═══════════════════════════════════════════════════════════════════════

function Tooltip({ children, content }: { children: ReactNode; content: string }) {
  return (
    <span className="tooltip-trigger inline-flex">
      {children}
      <span className="tooltip-content">{content}</span>
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  API Documentation Tab
// ═══════════════════════════════════════════════════════════════════════

function ApiDocsTab() {
  const { t } = useTranslation();
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const baseUrl = window.location.origin + '/api';
  const sampleKey = 'owa_k1_example...';

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleEndpoint = (path: string) => {
    setExpandedEndpoint(prev => prev === path ? null : path);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Authentication Info */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
        <div className="mb-4 flex items-center gap-2.5">
          <Tooltip content={t('apiDocs.auth.title')}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Shield size={17} className="text-primary" />
            </div>
          </Tooltip>
          <h3 className="m-0 text-base font-semibold text-ink">{t('apiDocs.auth.title')}</h3>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-ink-secondary">{t('apiDocs.auth.description')}</p>
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex items-center gap-2 bg-muted px-4 py-2.5 border-b border-border">
            <Terminal size={14} className="text-ink-muted" />
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{t('apiDocs.example')}</span>
          </div>
          <pre className="m-0 overflow-x-auto bg-surface p-4 text-sm leading-relaxed">
            <code className="border-none bg-transparent p-0 text-ink">
              {`# ${t('apiDocs.auth.example')}\ncurl -H "X-API-Key: <your-api-key>" \\\n  -H "Content-Type: application/json" \\\n  ${baseUrl}/sessions`}
            </code>
          </pre>
        </div>
      </div>

      {/* SDK Collection */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
        <div className="mb-4 flex items-center gap-2.5">
          <Tooltip content={t('apiDocs.sdks.title')}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Code2 size={17} className="text-primary" />
            </div>
          </Tooltip>
          <h3 className="m-0 text-base font-semibold text-ink">{t('apiDocs.sdks.title')}</h3>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-ink-secondary">{t('apiDocs.sdks.description')}</p>
        <div className="flex flex-wrap gap-3">
          <Tooltip content="JavaScript SDK on npm">
            <a
              href="https://www.npmjs.com/package/@openwa/sdk"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-border bg-muted px-4 py-3 text-sm font-medium text-ink no-underline transition-all hover:border-primary/30 hover:bg-primary/5"
            >
              <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/npm.svg" alt="npm" className="h-4 w-4" />
              @openwa/sdk
              <ExternalLink size={12} className="text-ink-muted" />
            </a>
          </Tooltip>
          <Tooltip content="Python SDK on PyPI">
            <a
              href="https://pypi.org/project/openwa-sdk/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-border bg-muted px-4 py-3 text-sm font-medium text-ink no-underline transition-all hover:border-primary/30 hover:bg-primary/5"
            >
              <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/python.svg" alt="PyPI" className="h-4 w-4" />
              openwa-sdk
              <ExternalLink size={12} className="text-ink-muted" />
            </a>
          </Tooltip>
        </div>
      </div>

      {/* Endpoints */}
      <div className="rounded-xl border border-border bg-surface shadow-xs">
        <div className="flex items-center gap-2.5 border-b border-border px-6 py-4">
          <Tooltip content={t('apiDocs.endpoints.title')}>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <List size={15} className="text-primary" />
            </div>
          </Tooltip>
          <h3 className="m-0 text-base font-semibold text-ink">{t('apiDocs.endpoints.title')}</h3>
          <span className="ml-auto text-xs text-ink-muted">{apiEndpoints.length} {t('apiDocs.endpoints.title').toLowerCase()}</span>
        </div>

        <div className="divide-y divide-border">
          {apiEndpoints.map(ep => {
            const isExpanded = expandedEndpoint === ep.path;
            const methodColor = apiMethodColors[ep.method] || 'bg-gray-100 text-gray-700';
            const methodLabel = `${ep.method} request`;

            const resolvedCurl = ep.curlExample
              .replace(/\{\{baseUrl\}\}/g, baseUrl)
              .replace(/\{\{apiKey\}\}/g, sampleKey);

            return (
              <div key={ep.path} className="relative">
                {/* Endpoint row with hover preview */}
                <div className="group-hover-card relative">
                  <button
                    onClick={() => toggleEndpoint(ep.path)}
                    className="flex w-full cursor-pointer items-center gap-3 border-none bg-transparent px-6 py-3.5 text-left transition-all hover:bg-muted/50"
                  >
                    <Tooltip content={methodLabel}>
                      <span className={`shrink-0 rounded-md px-2.5 py-1 font-mono text-[0.7rem] font-bold uppercase leading-none ${methodColor}`}>
                        {ep.method}
                      </span>
                    </Tooltip>
                    <code className="flex-1 truncate font-mono text-sm text-ink">{ep.path}</code>
                    <Tooltip content={t(ep.description as any)}>
                      <span className="hidden truncate text-xs text-ink-muted max-w-[200px] sm:block">{t(ep.description as any)}</span>
                    </Tooltip>
                    {isExpanded ? <ChevronDown size={15} className="shrink-0 text-ink-muted" /> : <ChevronRight size={15} className="shrink-0 text-ink-muted" />}
                  </button>

                  {/* Hover preview card - shows quick endpoint info before expanding */}
                  <div className="hover-card">
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <span className={`shrink-0 rounded px-2 py-0.5 font-mono text-[0.65rem] font-bold uppercase leading-none ${methodColor}`}>
                        {ep.method}
                      </span>
                      <code className="font-mono text-xs text-ink">{ep.path}</code>
                    </div>
                    <p className="mb-2 text-sm text-ink-secondary">{t(ep.description as any)}</p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-ink-muted">
                        <Shield size={11} />
                        {t(ep.auth as any)}
                      </span>
                      {ep.body && (
                        <span className="flex items-center gap-1 text-ink-muted">
                          <Code2 size={11} />
                          {t('apiDocs.requestBody')}
                        </span>
                      )}
                      <span className="ml-auto text-primary/70">
                        {isExpanded ? t('common.cancel') : t('apiDocs.example')} →
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/30 px-6 py-5">
                    <div className="mb-4 flex flex-wrap items-start gap-3">
                      <Tooltip content={t(ep.auth as any)}>
                        <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                          <Shield size={12} />
                          <span>{t(ep.auth as any)}</span>
                        </div>
                      </Tooltip>
                    </div>

                    <p className="mb-4 text-sm text-ink-secondary">{t(ep.description as any)}</p>

                    {/* Request body */}
                    {ep.body && (
                      <div className="mb-4">
                        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-muted">{t('apiDocs.requestBody')}</h4>
                        <pre className="m-0 overflow-x-auto rounded-lg border border-border bg-surface p-4 text-sm leading-relaxed">
                          <code className="border-none bg-transparent p-0 text-ink">{ep.body}</code>
                        </pre>
                      </div>
                    )}

                    {/* cURL Example */}
                    <div className="mb-4">
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wide text-ink-muted">{t('apiDocs.example')}</h4>
                        <Tooltip content={copied === ep.path ? t('common.copied') : t('common.copy')}>
                          <button
                            className="flex cursor-pointer items-center gap-1.5 border-none bg-transparent text-xs font-medium text-primary transition-colors hover:text-primary-hover"
                            onClick={() => copyToClipboard(resolvedCurl, ep.path)}
                          >
                            {copied === ep.path ? <Check size={13} /> : <Copy size={13} />}
                            {copied === ep.path ? t('common.copied') : t('common.copy')}
                          </button>
                        </Tooltip>
                      </div>
                      <pre className="m-0 overflow-x-auto rounded-lg border border-border bg-surface p-4 text-sm leading-relaxed">
                        <code className="border-none bg-transparent p-0 text-ink">{resolvedCurl}</code>
                      </pre>
                    </div>

                    {/* Response */}
                    <div>
                      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-muted">{t('apiDocs.response')}</h4>
                      <pre className="m-0 overflow-x-auto rounded-lg border border-border bg-surface p-4 text-sm leading-relaxed">
                        <code className="border-none bg-transparent p-0 text-ink">{ep.responseExample}</code>
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Rate Limiting */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
        <div className="mb-4 flex items-center gap-2.5">
          <Tooltip content={t('apiDocs.rateLimit.title')}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Activity size={17} className="text-primary" />
            </div>
          </Tooltip>
          <h3 className="m-0 text-base font-semibold text-ink">{t('apiDocs.rateLimit.title')}</h3>
        </div>
        <p className="text-sm leading-relaxed text-ink-secondary">{t('apiDocs.rateLimit.description')}</p>
      </div>
    </div>
  );
}
