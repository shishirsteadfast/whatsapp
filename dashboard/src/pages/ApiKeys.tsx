import { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext } from 'react';
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
  AlertCircle,
  Globe,
  Rocket,
  Shield,
  List,
  Package,
  ChevronDown,
  ChevronRight,
  ExternalLink,
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

// ── Language switcher (drives every code sample on the page at once) ────

type Lang = 'curl' | 'javascript' | 'python' | 'php' | 'go';

const LANG_OPTIONS: { id: Lang; label: string }[] = [
  { id: 'curl', label: 'cURL' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'python', label: 'Python' },
  { id: 'php', label: 'PHP' },
  { id: 'go', label: 'Go' },
];

const LANG_STORAGE_KEY = 'openwa_docs_lang';

const LanguageContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: 'curl',
  setLang: () => {},
});
const useDocsLanguage = () => useContext(LanguageContext);

// ── Endpoint data ─────────────────────────────────────────────────────────

type EndpointGroup = 'general' | 'sessions' | 'messages' | 'contacts' | 'webhooks' | 'campaigns' | 'settings';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  group: EndpointGroup;
  description: string;
  auth: 'none' | 'apiKey' | 'admin';
  body?: string;
  response: string;
}

const apiEndpoints: ApiEndpoint[] = [
  {
    method: 'GET', path: '/health', group: 'general', auth: 'none',
    description: 'apiDocs.endpoints.health.desc',
    response: '{\n  "status": "ok",\n  "timestamp": "2025-01-01T00:00:00.000Z"\n}',
  },
  {
    method: 'GET', path: '/sessions', group: 'sessions', auth: 'apiKey',
    description: 'apiDocs.endpoints.sessions.list',
    response: '[\n  {\n    "id": "session-id",\n    "name": "my-session",\n    "status": "ready",\n    "phone": "1234567890",\n    "createdAt": "2025-01-01T00:00:00.000Z"\n  }\n]',
  },
  {
    method: 'POST', path: '/sessions', group: 'sessions', auth: 'apiKey',
    description: 'apiDocs.endpoints.sessions.create',
    body: '{\n  "name": "my-session"\n}',
    response: '{\n  "id": "session-id",\n  "name": "my-session",\n  "status": "created",\n  "createdAt": "2025-01-01T00:00:00.000Z"\n}',
  },
  {
    method: 'GET', path: '/sessions/{sessionId}/qr', group: 'sessions', auth: 'apiKey',
    description: 'apiDocs.endpoints.sessions.qr',
    response: '{\n  "qrCode": "base64-encoded-qr-image",\n  "status": "qr_ready"\n}',
  },
  {
    method: 'DELETE', path: '/sessions/{sessionId}', group: 'sessions', auth: 'apiKey',
    description: 'apiDocs.endpoints.sessions.delete',
    response: '{\n  "success": true\n}',
  },
  {
    method: 'POST', path: '/sessions/{sessionId}/messages/send-text', group: 'messages', auth: 'apiKey',
    description: 'apiDocs.endpoints.messages.sendText',
    body: '{\n  "phoneNumber": "+8801712345678",\n  "text": "Hello, World!"\n}',
    response: '{\n  "messageId": "msg-id",\n  "timestamp": 1735689600\n}',
  },
  {
    method: 'POST', path: '/sessions/{sessionId}/messages/send-image', group: 'messages', auth: 'apiKey',
    description: 'apiDocs.endpoints.messages.sendImage',
    body: '{\n  "phoneNumber": "+8801712345678",\n  "url": "https://example.com/image.jpg",\n  "caption": "Optional caption"\n}',
    response: '{\n  "messageId": "msg-id",\n  "timestamp": 1735689600\n}',
  },
  {
    method: 'POST', path: '/sessions/{sessionId}/messages/send-location', group: 'messages', auth: 'apiKey',
    description: 'apiDocs.endpoints.messages.sendLocation',
    body: '{\n  "phoneNumber": "+8801712345678",\n  "latitude": -6.2088,\n  "longitude": 106.8456,\n  "description": "Meeting point"\n}',
    response: '{\n  "messageId": "msg-id",\n  "timestamp": 1735689600\n}',
  },
  {
    method: 'GET', path: '/messages', group: 'messages', auth: 'apiKey',
    description: 'apiDocs.endpoints.messages.list',
    response: '[\n  {\n    "id": "msg-id",\n    "sessionId": "session-id",\n    "chatId": "1234567890@c.us",\n    "body": "Hello",\n    "direction": "outgoing",\n    "status": "sent",\n    "createdAt": "2025-01-01T00:00:00.000Z"\n  }\n]',
  },
  {
    method: 'GET', path: '/contacts', group: 'contacts', auth: 'apiKey',
    description: 'apiDocs.endpoints.contacts.list',
    response: '[\n  {\n    "id": "contact-id",\n    "fullName": "John Doe",\n    "phone": "1234567890",\n    "countryCode": "+1",\n    "createdAt": "2025-01-01T00:00:00.000Z"\n  }\n]',
  },
  {
    method: 'POST', path: '/contacts', group: 'contacts', auth: 'apiKey',
    description: 'apiDocs.endpoints.contacts.create',
    body: '{\n  "fullName": "John Doe",\n  "phone": "1234567890",\n  "countryCode": "+1"\n}',
    response: '{\n  "id": "contact-id",\n  "fullName": "John Doe",\n  "phone": "1234567890",\n  "countryCode": "+1",\n  "createdAt": "2025-01-01T00:00:00.000Z"\n}',
  },
  {
    method: 'GET', path: '/webhooks', group: 'webhooks', auth: 'apiKey',
    description: 'apiDocs.endpoints.webhooks.list',
    response: '[\n  {\n    "id": "webhook-id",\n    "sessionId": "session-id",\n    "url": "https://example.com/webhook",\n    "events": ["message.received", "message.sent"],\n    "active": true\n  }\n]',
  },
  {
    method: 'GET', path: '/campaigns', group: 'campaigns', auth: 'apiKey',
    description: 'apiDocs.endpoints.campaigns.list',
    response: '{\n  "campaigns": [\n    {\n      "id": "campaign-id",\n      "name": "Holiday Promotion",\n      "status": "completed",\n      "sentCount": 100,\n      "failedCount": 2\n    }\n  ],\n  "total": 1\n}',
  },
  {
    method: 'POST', path: '/campaigns', group: 'campaigns', auth: 'apiKey',
    description: 'apiDocs.endpoints.campaigns.create',
    body: '{\n  "name": "Holiday Promotion",\n  "sessionId": "session-id",\n  "recipientType": "contacts",\n  "recipientIds": ["contact-id-1", "contact-id-2"],\n  "messageContent": {\n    "type": "text",\n    "text": "Check out our holiday deals!"\n  }\n}',
    response: '{\n  "id": "campaign-id",\n  "name": "Holiday Promotion",\n  "status": "draft",\n  "createdAt": "2025-01-01T00:00:00.000Z"\n}',
  },
  {
    method: 'GET', path: '/settings', group: 'settings', auth: 'admin',
    description: 'apiDocs.endpoints.settings.get',
    response: '{\n  "general": {\n    "apiBaseUrl": "https://api.example.com",\n    "sessionTimeout": 86400000,\n    "autoReconnect": true\n  },\n  "api": {\n    "rateLimit": 100,\n    "rateLimitWindow": 60,\n    "enableDocs": true\n  }\n}',
  },
];

const GROUP_ORDER: EndpointGroup[] = ['general', 'sessions', 'messages', 'contacts', 'webhooks', 'campaigns', 'settings'];

const methodColors: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  PATCH: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
};

// ── Per-language snippet generation ─────────────────────────────────────
// Request bodies are plain JSON, which happens to also be valid JS/Python
// object-literal syntax, so the same string can be embedded verbatim in
// every generated sample below.

function curlSnippet(method: string, url: string, body?: string, apiKey?: string | null) {
  const parts = [`curl${method === 'GET' ? '' : ` -X ${method}`} "${url}"`];
  if (apiKey) parts.push(`-H "X-API-Key: ${apiKey}"`);
  if (body) parts.push(`-H "Content-Type: application/json"`);
  if (body) parts.push(`-d '${body}'`);
  return parts.join(' \\\n  ');
}

function jsSnippet(method: string, url: string, body?: string, apiKey?: string | null) {
  const headers: string[] = [];
  if (apiKey) headers.push(`"X-API-Key": "${apiKey}"`);
  if (body) headers.push(`"Content-Type": "application/json"`);
  const headersBlock = headers.length ? `\n  headers: {\n    ${headers.join(',\n    ')}\n  },` : '';
  const bodyBlock = body ? `\n  body: JSON.stringify(${body}),` : '';
  return `const response = await fetch("${url}", {\n  method: "${method}",${headersBlock}${bodyBlock}\n});\n\nconst data = await response.json();\nconsole.log(data);`;
}

function pythonSnippet(method: string, url: string, body?: string, apiKey?: string | null) {
  const lines = ['import requests', '', `url = "${url}"`];
  if (apiKey) lines.push(`headers = {"X-API-Key": "${apiKey}"}`);
  if (body) lines.push(`payload = ${body}`);
  const args: string[] = [];
  if (apiKey) args.push('headers=headers');
  if (body) args.push('json=payload');
  lines.push('', `response = requests.${method.toLowerCase()}(url${args.length ? ', ' + args.join(', ') : ''})`);
  lines.push('print(response.json())');
  return lines.join('\n');
}

function phpSnippet(method: string, url: string, body?: string, apiKey?: string | null) {
  const headerLines: string[] = [];
  if (apiKey) headerLines.push(`    "X-API-Key: ${apiKey}",`);
  if (body) headerLines.push(`    "Content-Type: application/json",`);
  const lines = ['<?php', `$ch = curl_init("${url}");`, 'curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);'];
  if (method !== 'GET') lines.push(`curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "${method}");`);
  if (headerLines.length) {
    headerLines[headerLines.length - 1] = headerLines[headerLines.length - 1].replace(/,$/, '');
    lines.push('curl_setopt($ch, CURLOPT_HTTPHEADER, [', ...headerLines, ']);');
  }
  if (body) lines.push(`curl_setopt($ch, CURLOPT_POSTFIELDS, '${body}');`);
  lines.push('', '$response = curl_exec($ch);', 'curl_close($ch);', 'echo $response;');
  return lines.join('\n');
}

function goSnippet(method: string, url: string, body?: string, apiKey?: string | null) {
  const imports = ['"fmt"', '"io"', '"net/http"'];
  if (body) imports.push('"strings"');
  const bodyVar = body ? `strings.NewReader(\`${body}\`)` : 'nil';
  const lines = [
    'package main', '',
    'import (',
    ...imports.map(i => `\t${i}`),
    ')', '',
    'func main() {',
    `\treq, _ := http.NewRequest("${method}", "${url}", ${bodyVar})`,
  ];
  if (apiKey) lines.push(`\treq.Header.Set("X-API-Key", "${apiKey}")`);
  if (body) lines.push(`\treq.Header.Set("Content-Type", "application/json")`);
  lines.push(
    '',
    '\tresp, _ := http.DefaultClient.Do(req)',
    '\tdefer resp.Body.Close()',
    '',
    '\tdata, _ := io.ReadAll(resp.Body)',
    '\tfmt.Println(string(data))',
    '}',
  );
  return lines.join('\n');
}

function buildSnippet(lang: Lang, method: string, url: string, body: string | undefined, apiKey: string | null): string {
  switch (lang) {
    case 'curl':       return curlSnippet(method, url, body, apiKey);
    case 'javascript': return jsSnippet(method, url, body, apiKey);
    case 'python':     return pythonSnippet(method, url, body, apiKey);
    case 'php':        return phpSnippet(method, url, body, apiKey);
    case 'go':         return goSnippet(method, url, body, apiKey);
  }
}

function getEndpointSnippet(lang: Lang, ep: Pick<ApiEndpoint, 'method' | 'path' | 'body' | 'auth'>, baseUrl: string, sampleKey: string) {
  const auth = ep.auth !== 'none' ? sampleKey : null;
  return buildSnippet(lang, ep.method, baseUrl + ep.path, ep.body, auth);
}

// ── Helper hook ─────────────────────────────────────────────────────────

function useWindowSize() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

const columnHelper = createColumnHelper<ApiKey>();

type RegisterSection = (id: string) => (el: HTMLElement | null) => void;

// ── Table of contents ────────────────────────────────────────────────────

const TOC_SECTIONS = [
  { id: 'introduction',   icon: Rocket,      key: 'introduction' },
  { id: 'authentication', icon: Shield,      key: 'authentication' },
  { id: 'your-keys',      icon: KeyRound,    key: 'yourKeys' },
  { id: 'errors',         icon: AlertCircle, key: 'errors' },
  { id: 'endpoints',      icon: List,        key: 'endpoints' },
  { id: 'sdks',           icon: Package,     key: 'sdks' },
] as const;

// ── Root component ───────────────────────────────────────────────────────

export function ApiKeys() {
  const { t } = useTranslation();
  useDocumentTitle(t('apiKeys.title'));

  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    return (LANG_OPTIONS.some(o => o.id === saved) ? saved : 'curl') as Lang;
  });
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(LANG_STORAGE_KEY, l);
  }, []);

  const [activeSection, setActiveSection] = useState<string>('introduction');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
    );
    Object.values(sectionRefs.current).forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const registerSection: RegisterSection = id => el => {
    sectionRefs.current[id] = el;
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      <div className="w-full p-8 max-sm:p-4">
        <PageHeader title={t('apiKeys.title')} subtitle={t('apiKeys.subtitle')} />

        <div className="flex items-start gap-8 max-lg:flex-col max-lg:gap-5">
          {/* ── TOC sidebar (desktop) ── */}
          <nav className="sticky top-20 hidden w-56 shrink-0 flex-col gap-0.5 lg:flex">
            {TOC_SECTIONS.map(({ id, icon: Icon, key }) => (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border-none px-3 py-2 text-left text-sm font-medium transition-all ${
                  activeSection === id
                    ? 'bg-primary/10 text-primary'
                    : 'bg-transparent text-ink-secondary hover:bg-muted hover:text-ink'
                }`}
              >
                <Icon size={15} />
                {t(`apiDocs.nav.${key}`)}
              </button>
            ))}
          </nav>

          {/* ── TOC (mobile) ── */}
          <nav className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:hidden">
            {TOC_SECTIONS.map(({ id, icon: Icon, key }) => (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                className={`flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeSection === id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-surface text-ink-secondary'
                }`}
              >
                <Icon size={13} />
                {t(`apiDocs.nav.${key}`)}
              </button>
            ))}
          </nav>

          {/* ── Content ── */}
          <div className="flex min-w-0 flex-1 flex-col gap-10">
            <LanguageSwitcher />
            <IntroductionSection registerSection={registerSection} />
            <AuthenticationSection registerSection={registerSection} />
            <YourKeysSection registerSection={registerSection} />
            <ErrorsSection registerSection={registerSection} />
            <EndpointsSection registerSection={registerSection} />
            <SdksSection registerSection={registerSection} />
          </div>
        </div>
      </div>
    </LanguageContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Language Switcher
// ═══════════════════════════════════════════════════════════════════════

function LanguageSwitcher() {
  const { t } = useTranslation();
  const { lang, setLang } = useDocsLanguage();
  return (
    <div className="flex w-fit flex-wrap gap-1 rounded-xl border border-border bg-surface p-1 shadow-xs">
      {LANG_OPTIONS.map(opt => (
        <button
          key={opt.id}
          onClick={() => setLang(opt.id)}
          className={`cursor-pointer whitespace-nowrap rounded-lg border-none px-3.5 py-2 text-sm font-semibold transition-all ${
            lang === opt.id
              ? 'bg-primary text-white shadow-sm'
              : 'bg-transparent text-ink-secondary hover:bg-muted hover:text-ink'
          }`}
        >
          {t(`apiDocs.languages.${opt.id}`)}
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Code Block
// ═══════════════════════════════════════════════════════════════════════

function CodeBlock({ code, lang }: { code: string; lang: Lang }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const label = LANG_OPTIONS.find(o => o.id === lang)?.label ?? lang;

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between border-b border-border bg-muted px-4 py-2">
        <span className="font-mono text-[0.7rem] font-semibold uppercase tracking-wide text-ink-muted">{label}</span>
        <button
          onClick={copy}
          className="flex cursor-pointer items-center gap-1.5 border-none bg-transparent text-xs font-medium text-ink-secondary transition-colors hover:text-ink"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? t('common.copied') : t('common.copy')}
        </button>
      </div>
      <pre className="m-0 overflow-x-auto bg-surface p-4 text-[0.8125rem] leading-relaxed">
        <code className="whitespace-pre border-none bg-transparent p-0 text-ink">{code}</code>
      </pre>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Introduction
// ═══════════════════════════════════════════════════════════════════════

function IntroductionSection({ registerSection }: { registerSection: RegisterSection }) {
  const { t } = useTranslation();
  const { lang } = useDocsLanguage();
  const [copied, setCopied] = useState(false);
  const baseUrl = window.location.origin + '/api';

  const quickStartEp = apiEndpoints.find(e => e.path === '/sessions' && e.method === 'GET')!;
  const code = getEndpointSnippet(lang, quickStartEp, baseUrl, 'YOUR_API_KEY');

  const copyBaseUrl = () => {
    navigator.clipboard.writeText(baseUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section id="introduction" ref={registerSection('introduction')} className="scroll-mt-24">
      <h2 className="mb-2 text-xl font-bold text-ink">{t('apiDocs.intro.title')}</h2>
      <p className="mb-5 max-w-2xl text-sm leading-relaxed text-ink-secondary">{t('apiDocs.intro.description')}</p>

      <div className="mb-5 rounded-xl border border-border bg-surface p-5 shadow-xs">
        <div className="mb-2 flex items-center gap-2">
          <Globe size={15} className="text-primary" />
          <span className="text-sm font-semibold text-ink">{t('apiKeys.credentials.baseUrl')}</span>
        </div>
        <p className="mb-3 text-xs text-ink-muted">{t('apiKeys.credentials.baseUrlHint')}</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 break-all rounded-lg border border-border bg-muted px-4 py-2.5 font-mono text-sm text-ink">
            {baseUrl}
          </code>
          <button className="icon-btn" onClick={copyBaseUrl} title={t('common.copy') as string}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold text-ink">{t('apiDocs.intro.quickStart')}</h3>
        <p className="mb-3 text-xs text-ink-muted">{t('apiDocs.intro.quickStartHint')}</p>
        <CodeBlock code={code} lang={lang} />
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Authentication
// ═══════════════════════════════════════════════════════════════════════

function AuthenticationSection({ registerSection }: { registerSection: RegisterSection }) {
  const { t } = useTranslation();
  const { lang } = useDocsLanguage();
  const baseUrl = window.location.origin + '/api';
  const code = getEndpointSnippet(lang, { method: 'GET', path: '/sessions', auth: 'apiKey' }, baseUrl, 'YOUR_API_KEY');

  return (
    <section id="authentication" ref={registerSection('authentication')} className="scroll-mt-24">
      <h2 className="mb-2 text-xl font-bold text-ink">{t('apiDocs.auth.title')}</h2>
      <p className="mb-4 max-w-2xl text-sm leading-relaxed text-ink-secondary">
        <Trans i18nKey="apiDocs.auth.description" components={{ code: <code /> }} />
      </p>
      <CodeBlock code={code} lang={lang} />
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Your API Keys
// ═══════════════════════════════════════════════════════════════════════

function YourKeysSection({ registerSection }: { registerSection: RegisterSection }) {
  const { t } = useTranslation();
  const { data: apiKeys = [], isLoading: loading } = useApiKeysQuery();
  const { data: stats } = useApiKeyStatsQuery();
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

  const activeKeys = apiKeys.filter(k => k.isActive);
  const totalCalls = apiKeys.reduce((sum, k) => sum + (k.usageCount || 0), 0);

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

  const statChips = [
    { label: t('apiKeys.stats.totalKeys'), value: apiKeys.length },
    { label: t('apiKeys.stats.activeKeys'), value: activeKeys.length },
    { label: t('apiKeys.stats.totalCalls'), value: totalCalls },
    { label: t('apiKeys.stats.rateLimit'), value: stats?.callsToday ?? '—' },
  ];

  return (
    <section id="your-keys" ref={registerSection('your-keys')} className="scroll-mt-24">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="mb-1 text-xl font-bold text-ink">{t('apiDocs.nav.yourKeys')}</h2>
          <p className="max-w-xl text-sm text-ink-secondary">{t('apiKeys.manageHint')}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} />
          {t('apiKeys.createBtn')}
        </button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statChips.map(chip => (
          <div key={chip.label} className="rounded-lg border border-border bg-surface px-4 py-3">
            <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-ink-muted">{chip.label}</div>
            <div className="mt-1 text-lg font-bold text-ink">
              {typeof chip.value === 'number' ? chip.value.toLocaleString() : chip.value}
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-[200px] w-full items-center justify-center">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : (
        <>
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

          <div className="mt-5 rounded-xl border border-border bg-surface p-6 shadow-xs">
            <h3 className="mb-4 text-base font-semibold text-ink">{t('apiKeys.rolesTitle')}</h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
              {roleNames.map(r => (
                <div key={r} className="flex flex-col gap-1 rounded-(--radius) bg-muted p-3">
                  <code className="w-fit rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">{r}</code>
                  <span className="text-xs text-ink-secondary">{t(`apiKeys.roleDescriptions.${r}`)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

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
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Errors & Rate Limits
// ═══════════════════════════════════════════════════════════════════════

const ERROR_CODES = ['200', '400', '401', '403', '404', '429', '500'] as const;

function ErrorsSection({ registerSection }: { registerSection: RegisterSection }) {
  const { t } = useTranslation();

  return (
    <section id="errors" ref={registerSection('errors')} className="scroll-mt-24">
      <h2 className="mb-2 text-xl font-bold text-ink">{t('apiDocs.errors.title')}</h2>
      <p className="mb-4 max-w-2xl text-sm leading-relaxed text-ink-secondary">{t('apiDocs.errors.description')}</p>

      <div className="mb-6 overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
        {ERROR_CODES.map(code => (
          <div key={code} className="flex items-start gap-4 border-b border-border px-5 py-3.5 last:border-none">
            <code className="shrink-0 rounded-md bg-muted px-2.5 py-1 font-mono text-xs font-bold text-ink">{code}</code>
            <span className="text-sm text-ink-secondary">{t(`apiDocs.errors.codes.${code}`)}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
        <div className="mb-2 flex items-center gap-2">
          <AlertTriangle size={15} className="text-amber-500" />
          <h3 className="text-base font-semibold text-ink">{t('apiDocs.rateLimit.title')}</h3>
        </div>
        <p className="text-sm leading-relaxed text-ink-secondary">{t('apiDocs.rateLimit.description')}</p>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Endpoints
// ═══════════════════════════════════════════════════════════════════════

function EndpointsSection({ registerSection }: { registerSection: RegisterSection }) {
  const { t } = useTranslation();
  const { lang } = useDocsLanguage();
  const [expanded, setExpanded] = useState<string | null>(null);
  const baseUrl = window.location.origin + '/api';
  const sampleKey = 'YOUR_API_KEY';

  const toggle = (key: string) => setExpanded(prev => (prev === key ? null : key));

  return (
    <section id="endpoints" ref={registerSection('endpoints')} className="scroll-mt-24">
      <h2 className="mb-2 text-xl font-bold text-ink">{t('apiDocs.endpoints.title')}</h2>
      <p className="mb-5 max-w-2xl text-sm leading-relaxed text-ink-secondary">{t('apiDocs.endpoints.hint')}</p>

      <div className="flex flex-col gap-6">
        {GROUP_ORDER.map(group => {
          const items = apiEndpoints.filter(e => e.group === group);
          if (!items.length) return null;

          return (
            <div key={group}>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-muted">{t(`apiDocs.groups.${group}`)}</h3>
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
                {items.map(ep => {
                  const key = `${ep.method} ${ep.path}`;
                  const isOpen = expanded === key;
                  const code = getEndpointSnippet(lang, ep, baseUrl, sampleKey);
                  const description = t(ep.description as any);

                  return (
                    <div key={key}>
                      <button
                        onClick={() => toggle(key)}
                        className="flex w-full cursor-pointer items-center gap-3 border-none bg-transparent px-5 py-3.5 text-left transition-all hover:bg-muted/50"
                      >
                        <span className={`shrink-0 rounded-md px-2.5 py-1 font-mono text-[0.7rem] font-bold uppercase leading-none ${methodColors[ep.method]}`}>
                          {ep.method}
                        </span>
                        <code className="flex-1 truncate font-mono text-sm text-ink">{ep.path}</code>
                        <span className="hidden max-w-[240px] truncate text-xs text-ink-muted sm:block" title={description}>
                          {description}
                        </span>
                        {isOpen ? <ChevronDown size={15} className="shrink-0 text-ink-muted" /> : <ChevronRight size={15} className="shrink-0 text-ink-muted" />}
                      </button>

                      {isOpen && (
                        <div className="border-t border-border bg-muted/30 px-5 py-5">
                          <div className="mb-3 flex items-center gap-1.5 text-xs text-ink-muted">
                            <Shield size={12} />
                            <span>{t(`apiDocs.auth.${ep.auth}`)}</span>
                          </div>

                          <p className="mb-4 text-sm text-ink-secondary">{description}</p>

                          {ep.body && (
                            <div className="mb-4">
                              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-muted">{t('apiDocs.requestBody')}</h4>
                              <pre className="m-0 overflow-x-auto rounded-lg border border-border bg-surface p-4 text-sm leading-relaxed">
                                <code className="border-none bg-transparent p-0 text-ink">{ep.body}</code>
                              </pre>
                            </div>
                          )}

                          <div className="mb-4">
                            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-muted">{t('apiDocs.example')}</h4>
                            <CodeBlock code={code} lang={lang} />
                          </div>

                          <div>
                            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-muted">{t('apiDocs.response')}</h4>
                            <pre className="m-0 overflow-x-auto rounded-lg border border-border bg-surface p-4 text-sm leading-relaxed">
                              <code className="border-none bg-transparent p-0 text-ink">{ep.response}</code>
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  SDKs & Libraries
// ═══════════════════════════════════════════════════════════════════════

function SdksSection({ registerSection }: { registerSection: RegisterSection }) {
  const { t } = useTranslation();

  return (
    <section id="sdks" ref={registerSection('sdks')} className="scroll-mt-24 pb-10">
      <h2 className="mb-2 text-xl font-bold text-ink">{t('apiDocs.sdks.title')}</h2>
      <p className="mb-4 max-w-2xl text-sm leading-relaxed text-ink-secondary">{t('apiDocs.sdks.description')}</p>
      <div className="flex flex-wrap gap-3">
        <a
          href="https://www.npmjs.com/package/@openwa/sdk"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-ink no-underline shadow-xs transition-all hover:border-primary/30 hover:bg-primary/5"
        >
          <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/npm.svg" alt="npm" className="h-4 w-4" />
          @openwa/sdk
          <ExternalLink size={12} className="text-ink-muted" />
        </a>
        <a
          href="https://pypi.org/project/openwa-sdk/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-ink no-underline shadow-xs transition-all hover:border-primary/30 hover:bg-primary/5"
        >
          <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/python.svg" alt="PyPI" className="h-4 w-4" />
          openwa-sdk
          <ExternalLink size={12} className="text-ink-muted" />
        </a>
      </div>
    </section>
  );
}
