import { useState, useEffect } from 'react';
import type React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  Database,
  Server,
  HardDrive,
  Save,
  ExternalLink,
  Loader2,
  CheckCircle,
  Trash2,
  Globe,
  Webhook,
  Gauge,
} from 'lucide-react';
import { infraApi } from '../services/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useInfraStatusQuery } from '../hooks/queries';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';

import sqliteIcon from '../assets/icons/sqlite.svg';
import postgresIcon from '../assets/icons/postgresql.svg';
import folderIcon from '../assets/icons/folder.svg';
import s3Icon from '../assets/icons/s3.svg';

interface DatabaseConfig {
  type: 'sqlite' | 'postgres';
  builtIn: boolean;
  host: string;
  port: string;
  username: string;
  password: string;
  database: string;
  poolSize: number;
  sslEnabled: boolean;
}

interface RedisConfig {
  builtIn: boolean;
  host: string;
  port: string;
  password: string;
  connected: boolean;
}

interface StorageConfig {
  type: 'local' | 's3';
  builtIn: boolean;
  localPath: string;
  s3Bucket: string;
  s3Region: string;
  s3AccessKey: string;
  s3SecretKey: string;
  s3Endpoint: string;
}

interface QueueStats {
  pending: number;
  completed: number;
  failed: number;
}

interface ServerConfig {
  port: string;
  nodeEnv: 'production' | 'development';
  domain: string;
  dashboardPort: string;
  baseUrl: string;
  dashboardUrl: string;
  corsOrigins: string;
}

interface WebhookConfig {
  timeout: number;
  maxRetries: number;
  retryDelay: number;
}

interface RateLimitConfig {
  ttl: number;
  max: number;
}

export function Infrastructure() {
  const { t } = useTranslation();
  useDocumentTitle(t('infrastructure.title'));
  const toast = useToast();
  const { data: infraStatus, isLoading: loading } = useInfraStatusQuery();
  const [saving, setSaving] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [restartCountdown, setRestartCountdown] = useState(0);
  const [restartStatus, setRestartStatus] = useState<'idle' | 'restarting' | 'waiting' | 'success' | 'error'>('idle');

  const [dbConfig, setDbConfig] = useState<DatabaseConfig>({
    type: 'sqlite',
    builtIn: false,
    host: 'localhost',
    port: '5432',
    username: 'postgres',
    password: '',
    database: 'openwa',
    poolSize: 10,
    sslEnabled: false,
  });

  const [redisConfig, setRedisConfig] = useState<RedisConfig>({
    builtIn: false,
    host: 'localhost',
    port: '6379',
    password: '',
    connected: false,
  });

  const [storageConfig, setStorageConfig] = useState<StorageConfig>({
    type: 'local',
    builtIn: false,
    localPath: './data/media',
    s3Bucket: '',
    s3Region: 'ap-southeast-1',
    s3AccessKey: '',
    s3SecretKey: '',
    s3Endpoint: '',
  });

  const [queueStats, setQueueStats] = useState({
    messages: { pending: 0, completed: 0, failed: 0 } as QueueStats,
    webhooks: { pending: 0, completed: 0, failed: 0 } as QueueStats,
  });

  const [redisEnabled, setRedisEnabled] = useState(false);
  const [queueEnabled, setQueueEnabled] = useState(false);
  const [pendingProfiles, setPendingProfiles] = useState<string[]>([]);
  const [previousProfiles, setPreviousProfiles] = useState<string[]>([]);

  const [serverConfig, setServerConfig] = useState<ServerConfig>({
    port: '2785',
    nodeEnv: 'development',
    domain: 'localhost',
    dashboardPort: '2886',
    baseUrl: '',
    dashboardUrl: '',
    corsOrigins: '*',
  });

  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig>({
    timeout: 10000,
    maxRetries: 3,
    retryDelay: 5000,
  });

  const [rateLimitConfig, setRateLimitConfig] = useState<RateLimitConfig>({
    ttl: 60,
    max: 100,
  });

  useEffect(() => {
    if (!infraStatus) return;

    setDbConfig(prev => ({
      ...prev,
      type: (infraStatus.database.type as 'sqlite' | 'postgres') || 'sqlite',
      host: infraStatus.database.host || 'localhost',
    }));

    setRedisConfig(prev => ({
      ...prev,
      host: infraStatus.redis.host,
      port: String(infraStatus.redis.port),
      connected: infraStatus.redis.connected,
    }));

    setStorageConfig(prev => ({
      ...prev,
      type: infraStatus.storage.type,
      localPath: infraStatus.storage.path || './uploads',
    }));

    setQueueEnabled(infraStatus.queue.enabled);
    setQueueStats({
      messages: infraStatus.queue.messages,
      webhooks: infraStatus.queue.webhooks,
    });
  }, [infraStatus]);

  const updateDbConfig = (key: keyof DatabaseConfig, value: string | number | boolean) =>
    setDbConfig(prev => ({ ...prev, [key]: value }));
  const updateRedisConfig = (key: keyof RedisConfig, value: string | boolean) =>
    setRedisConfig(prev => ({ ...prev, [key]: value }));
  const updateStorageConfig = (key: keyof StorageConfig, value: string | boolean) =>
    setStorageConfig(prev => ({ ...prev, [key]: value }));
  const updateServerConfig = (key: keyof ServerConfig, value: string) =>
    setServerConfig(prev => ({ ...prev, [key]: value }));
  const updateWebhookConfig = (key: keyof WebhookConfig, value: number) =>
    setWebhookConfig(prev => ({ ...prev, [key]: value }));
  const updateRateLimitConfig = (key: keyof RateLimitConfig, value: number) =>
    setRateLimitConfig(prev => ({ ...prev, [key]: value }));

  const SectionCard = ({ children, icon: Icon, title, status }: { children: React.ReactNode; icon: React.ElementType; title: string; status?: React.ReactNode }) => (
    <section className="w-full rounded-xl border border-border bg-surface p-6 shadow-xs">
      <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Icon size={20} className="text-primary" />
          <h2 className="m-0 text-lg font-semibold text-ink">{title}</h2>
        </div>
        {status}
      </div>
      {children}
    </section>
  );

  const StatusBadge = ({ variant, children }: { variant: 'connected' | 'disconnected' | 'sqlite'; children: React.ReactNode }) => {
    const variants = {
      connected: 'bg-primary/10 text-primary',
      disconnected: 'bg-red-100 text-red-600',
      sqlite: 'bg-sky-100 text-sky-700',
    };
    return (
      <span className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${variants[variant]}`}>
        {children}
      </span>
    );
  };

  const FormGroup = ({ label, children, small }: { label: string; children: React.ReactNode; small?: boolean }) => (
    <div className={`flex flex-col gap-2 ${small ? 'max-w-[120px]' : ''}`}>
      <label className="text-[0.7rem] font-bold uppercase tracking-[0.05em] text-ink-secondary">{label}</label>
      {children}
    </div>
  );

  const FormInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      {...props}
      className={`rounded-(--radius) border border-border bg-surface px-4 py-3 text-[0.9375rem] text-ink transition-all focus:border-primary focus:outline-none ${props.className || ''}`}
    />
  );

  const FormSelect = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select
      {...props}
      className={`rounded-(--radius) border border-border bg-surface px-4 py-3 text-[0.9375rem] text-ink transition-all focus:border-primary focus:outline-none ${props.className || ''}`}
    />
  );

  const Toggle = ({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description: string }) => (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0 flex-1">
        <span className="text-[0.9375rem] font-medium text-ink">{label}</span>
        <small className="block text-xs text-ink-muted/85">{description}</small>
      </div>
      <label className="relative shrink-0 h-[26px] w-[48px] cursor-pointer">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="absolute inset-0 rounded-[26px] bg-ink-muted transition-all peer-checked:bg-primary" />
        <span className="absolute bottom-[3px] left-[3px] h-5 w-5 rounded-full bg-white shadow-md transition-all peer-checked:translate-x-[22px]" />
      </label>
    </div>
  );

  const RadioOption = ({ checked, onChange, icon, label, desc }: { checked: boolean; onChange: () => void; icon: string; label: string; desc: string }) => (
    <label className={`relative cursor-pointer overflow-hidden rounded-(--radius) border-2 p-4 transition-all ${checked ? 'border-primary bg-primary/[0.05]' : 'border-border hover:border-ink-muted'}`}>
      <input type="radio" className="hidden" checked={checked} onChange={onChange} />
      <div className="flex flex-col gap-1">
        <span className="font-semibold text-ink">{label}</span>
        <small className="text-xs text-ink-secondary">{desc}</small>
      </div>
      <img src={icon} alt="" className="pointer-events-none absolute -bottom-[15px] -right-[15px] h-[100px] w-[100px] rotate-[-15deg] opacity-15 transition-all hover:opacity-25 aria-checked:opacity-30 aria-checked:scale-105" />
    </label>
  );

  if (loading) {
    return (
      <div className="flex min-h-[400px] w-full items-center justify-center p-8">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="w-full p-8">
      <PageHeader title={t('infrastructure.title')} subtitle={t('infrastructure.subtitle')} />

      <div className="grid grid-cols-2 gap-6 max-[900px]:grid-cols-1">
        {/* Server Configuration */}
        <SectionCard icon={Globe} title={t('infrastructure.server.title')}
          status={<StatusBadge variant={serverConfig.nodeEnv === 'production' ? 'connected' : 'sqlite'}>● {serverConfig.nodeEnv === 'production' ? t('infrastructure.server.production') : t('infrastructure.server.development')}</StatusBadge>}
        >
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
              <FormGroup label={t('infrastructure.server.environment')}>
                <FormSelect value={serverConfig.nodeEnv} onChange={e => updateServerConfig('nodeEnv', e.target.value)}>
                  <option value="production">{t('infrastructure.server.production')}</option>
                  <option value="development">{t('infrastructure.server.development')}</option>
                </FormSelect>
              </FormGroup>
              <FormGroup label={t('infrastructure.server.domain')}>
                <FormInput value={serverConfig.domain} onChange={e => updateServerConfig('domain', e.target.value)} placeholder="localhost" />
              </FormGroup>
            </div>
            <div className="grid grid-cols-[auto_auto_1fr] gap-4 max-[900px]:grid-cols-1">
              <FormGroup label={t('infrastructure.server.apiPort')} small>
                <FormInput value={serverConfig.port} onChange={e => updateServerConfig('port', e.target.value)} />
              </FormGroup>
              <FormGroup label={t('infrastructure.server.dashboardPort')} small>
                <FormInput value={serverConfig.dashboardPort} onChange={e => updateServerConfig('dashboardPort', e.target.value)} />
              </FormGroup>
              <FormGroup label={t('infrastructure.server.corsOrigins')}>
                <FormInput value={serverConfig.corsOrigins} onChange={e => updateServerConfig('corsOrigins', e.target.value)} placeholder={t('infrastructure.server.corsPlaceholder')} />
              </FormGroup>
            </div>
            <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
              <FormGroup label={t('infrastructure.server.publicApiUrl')}>
                <FormInput value={serverConfig.baseUrl} onChange={e => updateServerConfig('baseUrl', e.target.value)} placeholder="https://api.yourdomain.com" />
              </FormGroup>
              <FormGroup label={t('infrastructure.server.publicDashboardUrl')}>
                <FormInput value={serverConfig.dashboardUrl} onChange={e => updateServerConfig('dashboardUrl', e.target.value)} placeholder="https://dashboard.yourdomain.com" />
              </FormGroup>
            </div>
          </div>
        </SectionCard>

        {/* Webhook & Rate Limiting */}
        <SectionCard icon={Webhook} title={t('infrastructure.webhook.title')}>
          <div className="flex flex-col gap-4">
            <h3 className="m-0 mb-4 text-[0.9375rem] font-semibold text-ink-secondary">
              <Webhook size={16} className="me-2 align-middle" />
              {t('infrastructure.webhook.settings')}
            </h3>
            <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
              <FormGroup label={t('infrastructure.webhook.timeout')}>
                <FormInput type="number" value={webhookConfig.timeout} onChange={e => updateWebhookConfig('timeout', parseInt(e.target.value) || 10000)} />
              </FormGroup>
              <FormGroup label={t('infrastructure.webhook.maxRetries')} small>
                <FormInput type="number" min="0" max="10" value={webhookConfig.maxRetries} onChange={e => updateWebhookConfig('maxRetries', parseInt(e.target.value) || 3)} />
              </FormGroup>
              <FormGroup label={t('infrastructure.webhook.retryDelay')}>
                <FormInput type="number" value={webhookConfig.retryDelay} onChange={e => updateWebhookConfig('retryDelay', parseInt(e.target.value) || 5000)} />
              </FormGroup>
            </div>

            <div className="border-t border-border pt-6 mt-6">
              <h3 className="m-0 mb-4 text-[0.9375rem] font-semibold text-ink-secondary">
                <Gauge size={16} className="me-2 align-middle" />
                {t('infrastructure.webhook.rateLimit')}
              </h3>
              <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
                <FormGroup label={t('infrastructure.webhook.window')}>
                  <FormInput type="number" value={rateLimitConfig.ttl} onChange={e => updateRateLimitConfig('ttl', parseInt(e.target.value) || 60)} />
                </FormGroup>
                <FormGroup label={t('infrastructure.webhook.maxReq')}>
                  <FormInput type="number" value={rateLimitConfig.max} onChange={e => updateRateLimitConfig('max', parseInt(e.target.value) || 100)} />
                </FormGroup>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Database */}
        <SectionCard icon={Database} title={t('infrastructure.database.title')}
          status={<StatusBadge variant={dbConfig.type === 'postgres' ? 'connected' : 'sqlite'}>● {dbConfig.type === 'postgres' ? 'PostgreSQL' : 'SQLite'}</StatusBadge>}
        >
          <div className="grid grid-cols-2 gap-4 mb-6 max-[900px]:grid-cols-1">
            <RadioOption checked={dbConfig.type === 'sqlite'} onChange={() => updateDbConfig('type', 'sqlite')} icon={sqliteIcon} label={t('infrastructure.database.sqlite')} desc={t('infrastructure.database.sqliteDesc')} />
            <RadioOption checked={dbConfig.type === 'postgres'} onChange={() => updateDbConfig('type', 'postgres')} icon={postgresIcon} label={t('infrastructure.database.postgres')} desc={t('infrastructure.database.postgresDesc')} />
          </div>

          {dbConfig.type === 'postgres' && (
            <>
              <Toggle checked={dbConfig.builtIn} onChange={v => updateDbConfig('builtIn', v)} label={t('infrastructure.database.useBuiltIn')} description={t('infrastructure.database.builtInDesc')} />

              {!dbConfig.builtIn && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormGroup label={t('common.host')}><FormInput value={dbConfig.host} onChange={e => updateDbConfig('host', e.target.value)} /></FormGroup>
                    <FormGroup label={t('common.port')} small><FormInput value={dbConfig.port} onChange={e => updateDbConfig('port', e.target.value)} /></FormGroup>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormGroup label={t('common.username')}><FormInput value={dbConfig.username} onChange={e => updateDbConfig('username', e.target.value)} /></FormGroup>
                    <FormGroup label={t('common.password')}><FormInput type="password" value={dbConfig.password} onChange={e => updateDbConfig('password', e.target.value)} /></FormGroup>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormGroup label={t('infrastructure.database.dbName')}><FormInput value={dbConfig.database} onChange={e => updateDbConfig('database', e.target.value)} /></FormGroup>
                    <FormGroup label={t('infrastructure.database.poolSize')} small><FormInput type="number" min="1" max="50" value={dbConfig.poolSize} onChange={e => updateDbConfig('poolSize', parseInt(e.target.value) || 10)} /></FormGroup>
                  </div>
                  <Toggle checked={dbConfig.sslEnabled} onChange={v => updateDbConfig('sslEnabled', v)} label={t('infrastructure.database.ssl')} description={t('infrastructure.database.sslDesc')} />
                </div>
              )}
            </>
          )}

          <div className="mt-4 rounded-xl border border-dashed border-border bg-muted p-10 text-center">
            <Database size={32} className="mx-auto mb-4 text-primary opacity-70" />
            <p className="m-0 text-[0.9375rem] font-medium text-ink-secondary">{t('infrastructure.database.migrationsTitle')}</p>
            <p className="mt-3 flex items-center justify-center gap-1 text-sm font-medium text-primary">
              <CheckCircle size={16} />
              {t('infrastructure.database.migrationsStatus')}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">{t('infrastructure.database.migrationsHint')}</p>
          </div>
        </SectionCard>

        {/* Redis */}
        <SectionCard icon={Server} title={t('infrastructure.redis.title')}
          status={
            <StatusBadge variant={redisEnabled && redisConfig.connected ? 'connected' : 'disconnected'}>
              ● {redisEnabled ? (redisConfig.connected ? t('infrastructure.statusLabels.connected') : t('infrastructure.statusLabels.disconnected')) : t('infrastructure.statusLabels.disabled')}
            </StatusBadge>
          }
        >
          <div className={redisEnabled ? 'border-b border-border mb-6 pb-5' : ''}>
            <Toggle checked={redisEnabled} onChange={v => { setRedisEnabled(v); if (!v) setQueueEnabled(false); }} label={t('infrastructure.redis.enable')} description={t('infrastructure.redis.enableDesc')} />
          </div>

          {redisEnabled ? (
            <>
              <div className="mb-4">
                <Toggle checked={redisConfig.builtIn} onChange={v => updateRedisConfig('builtIn', v)} label={t('infrastructure.redis.useBuiltIn')} description={t('infrastructure.redis.builtInDesc')} />
              </div>

              {!redisConfig.builtIn && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormGroup label={t('common.host')}><FormInput value={redisConfig.host} onChange={e => updateRedisConfig('host', e.target.value)} /></FormGroup>
                    <FormGroup label={t('common.port')} small><FormInput value={redisConfig.port} onChange={e => updateRedisConfig('port', e.target.value)} /></FormGroup>
                    <FormGroup label={t('common.password')}><FormInput type="password" value={redisConfig.password} onChange={e => updateRedisConfig('password', e.target.value)} placeholder={t('infrastructure.redis.passwordOptional')} /></FormGroup>
                  </div>
                </div>
              )}

              <div className="mt-2 border-t border-border pt-5">
                <Toggle checked={queueEnabled} onChange={setQueueEnabled} label={t('infrastructure.redis.queueTitle')} description={t('infrastructure.redis.queueDesc')} />
              </div>

              {queueEnabled && (
                <div className="mt-6 border-t border-border pt-6">
                  <h3 className="m-0 mb-4 text-[0.9375rem] font-semibold text-ink">{t('infrastructure.redis.statsTitle')}</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4 max-[900px]:grid-cols-1">
                    {([['messages', t('infrastructure.redis.messageQueue')], ['webhooks', t('infrastructure.redis.webhookQueue')]] as const).map(([key, label]) => (
                      <div key={key} className="rounded-(--radius) bg-muted p-4">
                        <h4 className="m-0 mb-3 text-xs font-semibold text-ink-secondary">{label}</h4>
                        <div className="flex gap-6">
                          {(['pending', 'completed', 'failed'] as const).map(type => (
                            <div key={type} className="flex flex-col gap-[0.125rem]">
                              <span className={`text-xl font-bold ${
                                type === 'pending' ? 'text-amber-600' : type === 'completed' ? 'text-primary' : 'text-red-600'
                              }`}>
                                {type === 'completed'
                                  ? queueStats[key as keyof typeof queueStats][type].toLocaleString()
                                  : queueStats[key as keyof typeof queueStats][type]}
                              </span>
                              <span className={`text-[0.6875rem] uppercase tracking-[0.05em] ${
                                type === 'pending' ? 'text-amber-600' : type === 'completed' ? 'text-primary' : 'text-red-600'
                              }`}>
                                {t('infrastructure.redis.' + type)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3 max-[900px]:flex-col">
                    <button className="flex cursor-pointer items-center justify-center gap-2 rounded-(--radius) border border-red-600 bg-transparent px-4 py-[0.625rem] text-sm font-medium text-red-600 transition-all hover:bg-red-100">
                      <Trash2 size={16} />
                      {t('infrastructure.redis.clearFailed')}
                    </button>
                    <button
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-(--radius) border border-border bg-transparent px-4 py-[0.625rem] text-sm font-medium text-ink transition-all hover:bg-muted"
                      onClick={() => window.open('http://localhost:2785/api/admin/queues', '_blank')}
                    >
                      <ExternalLink size={16} />
                      {t('infrastructure.redis.viewBullMq')}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-border bg-muted p-10 text-center">
              <Server size={32} className="mx-auto mb-4 text-slate-400 opacity-50" />
              <p className="m-0 text-[0.9375rem] font-medium text-ink-secondary">{t('infrastructure.redis.disabledTitle')}</p>
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">{t('infrastructure.redis.disabledDesc')}</p>
            </div>
          )}
        </SectionCard>

        {/* Storage */}
        <SectionCard icon={HardDrive} title={t('infrastructure.storage.title')}>
          <div className="grid grid-cols-2 gap-4 mb-6 max-[900px]:grid-cols-1">
            <RadioOption checked={storageConfig.type === 'local'} onChange={() => updateStorageConfig('type', 'local')} icon={folderIcon} label={t('infrastructure.storage.local')} desc={t('infrastructure.storage.localDesc')} />
            <RadioOption checked={storageConfig.type === 's3'} onChange={() => updateStorageConfig('type', 's3')} icon={s3Icon} label={t('infrastructure.storage.s3')} desc={t('infrastructure.storage.s3Desc')} />
          </div>

          <div className="flex flex-col gap-4">
            {storageConfig.type === 'local' && (
              <FormGroup label={t('infrastructure.storage.storagePath')}>
                <FormInput value={storageConfig.localPath} onChange={e => updateStorageConfig('localPath', e.target.value)} />
              </FormGroup>
            )}

            {storageConfig.type === 's3' && (
              <>
                <Toggle checked={storageConfig.builtIn} onChange={v => updateStorageConfig('builtIn', v)} label={t('infrastructure.storage.useBuiltIn')} description={t('infrastructure.storage.builtInDesc')} />

                {!storageConfig.builtIn && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <FormGroup label={t('infrastructure.storage.bucket')}><FormInput value={storageConfig.s3Bucket} onChange={e => updateStorageConfig('s3Bucket', e.target.value)} /></FormGroup>
                      <FormGroup label={t('infrastructure.storage.region')}><FormInput value={storageConfig.s3Region} onChange={e => updateStorageConfig('s3Region', e.target.value)} /></FormGroup>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormGroup label={t('infrastructure.storage.accessKey')}><FormInput value={storageConfig.s3AccessKey} onChange={e => updateStorageConfig('s3AccessKey', e.target.value)} /></FormGroup>
                      <FormGroup label={t('infrastructure.storage.secretKey')}><FormInput type="password" value={storageConfig.s3SecretKey} onChange={e => updateStorageConfig('s3SecretKey', e.target.value)} /></FormGroup>
                    </div>
                    <FormGroup label={t('infrastructure.storage.endpoint')}>
                      <FormInput value={storageConfig.s3Endpoint} onChange={e => updateStorageConfig('s3Endpoint', e.target.value)} placeholder={t('infrastructure.storage.endpointHint')} />
                    </FormGroup>
                  </>
                )}
              </>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Save Footer */}
      <footer className="mt-8 flex justify-end border-t border-border pt-6">
        <button className="btn-primary large" onClick={handleSaveConfig} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          {saving ? t('infrastructure.saving') : t('infrastructure.saveConfig')}
        </button>
      </footer>

      {/* Restart Modal */}
      {showRestartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease]">
          <div className="w-[90%] max-w-[500px] animate-[slideUp_0.3s_ease] overflow-hidden rounded-2xl bg-surface text-center shadow-2xl">
            <div className="flex justify-center border-none px-6 pb-4 pt-6">
              <h2 className="m-0 text-xl font-bold text-ink">
                {restartStatus === 'idle' && t('infrastructure.restart.idleTitle')}
                {restartStatus === 'restarting' && t('infrastructure.restart.restartingTitle')}
                {restartStatus === 'waiting' && t('infrastructure.restart.waitingTitle')}
                {restartStatus === 'success' && t('infrastructure.restart.successTitle')}
                {restartStatus === 'error' && t('infrastructure.restart.errorTitle')}
              </h2>
            </div>
            <div className="px-8 py-8">
              {restartStatus === 'idle' && (
                <>
                  <p className="mb-6 text-base text-ink-secondary">
                    <Trans i18nKey="infrastructure.restart.idleDesc" components={{ code: <code />, br: <br /> }} />
                  </p>
                  <div className="flex justify-center gap-4">
                    <button className="btn-secondary" onClick={() => setShowRestartModal(false)}>{t('infrastructure.restart.later')}</button>
                    <button className="btn-primary" onClick={handleRestart}>{t('infrastructure.restart.now')}</button>
                  </div>
                </>
              )}

              {(restartStatus === 'restarting' || restartStatus === 'waiting') && (
                <>
                  <div className="mb-6">
                    <Loader2 className="mx-auto mb-4 animate-spin text-primary" size={48} />
                    <p className="text-lg font-medium text-ink">
                      {restartCountdown > 0
                        ? t('infrastructure.restart.restartingMsg', { count: restartCountdown })
                        : t('infrastructure.restart.checking')}
                    </p>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-md bg-slate-200">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-emerald-500 transition-[width] duration-[1s] linear"
                      style={{ width: restartCountdown > 0 ? `${((30 - restartCountdown) / 30) * 100}%` : '100%' }}
                    />
                  </div>
                  <p className="mt-4 text-sm text-ink-muted">{t('infrastructure.restart.dontClose')}</p>
                </>
              )}

              {restartStatus === 'success' && (
                <>
                  <CheckCircle size={48} className="mx-auto mb-4 text-primary" />
                  <p className="text-base text-ink-secondary">{t('infrastructure.restart.successMsg')}</p>
                </>
              )}

              {restartStatus === 'error' && (
                <>
                  <p className="mb-4 text-base text-red-600">{t('infrastructure.restart.errorMsg')}</p>
                  <button className="btn-primary" onClick={() => window.location.reload()}>{t('infrastructure.restart.reload')}</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
