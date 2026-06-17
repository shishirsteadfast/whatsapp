import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  Puzzle,
  Power,
  PowerOff,
  Settings,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Cpu,
  Database,
  Server,
  Shield,
  Zap,
  X,
} from 'lucide-react';
import { pluginsApi } from '../services/api';
import type { Plugin } from '../services/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import {
  usePluginsQuery,
  useEnginesQuery,
  useCurrentEngineQuery,
  useInfraStatusQuery,
  queryKeys,
} from '../hooks/queries';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';

type PluginType = 'engine' | 'storage' | 'queue' | 'auth' | 'extension';

const pluginTypeIcons: Record<PluginType, typeof Puzzle> = {
  engine: Cpu,
  storage: Database,
  queue: Server,
  auth: Shield,
  extension: Zap,
};

const headerGradients: Record<string, string> = {
  engine: 'from-primary to-emerald-500',
  storage: 'from-primary to-emerald-500',
  queue: 'from-orange-500 to-amber-500',
  auth: 'from-purple-500 to-violet-500',
  extension: 'from-pink-500 to-rose-500',
};

interface EngineConfig {
  type: string;
  headless: boolean;
  sessionDataPath: string;
  browserArgs: string;
}

export default function Plugins() {
  const { t } = useTranslation();
  useDocumentTitle(t('plugins.title'));
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: plugins = [], isLoading: loadingPlugins, error: queryError } = usePluginsQuery();
  const { data: engines = [] } = useEnginesQuery();
  const { data: currentEngineData } = useCurrentEngineQuery();
  const { data: infraStatus } = useInfraStatusQuery();
  const currentEngine = currentEngineData?.engineType ?? '';
  const loading = loadingPlugins;
  const error = queryError instanceof Error ? queryError.message : null;
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configPlugin, setConfigPlugin] = useState<Plugin | null>(null);
  const [engineConfig, setEngineConfig] = useState<EngineConfig>({
    type: infraStatus?.engine?.type || 'whatsapp-web.js',
    headless: infraStatus?.engine?.headless ?? true,
    sessionDataPath: '/data/sessions',
    browserArgs: '--no-sandbox --disable-gpu',
  });
  const [savingConfig, setSavingConfig] = useState(false);

  const refetchAll = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.plugins });
    void queryClient.invalidateQueries({ queryKey: queryKeys.engines });
    void queryClient.invalidateQueries({ queryKey: queryKeys.currentEngine });
  };

  const handleToggle = async (plugin: Plugin) => {
    setActionLoading(plugin.id);
    try {
      if (plugin.status === 'enabled') {
        await pluginsApi.disable(plugin.id);
      } else {
        await pluginsApi.enable(plugin.id);
      }
      refetchAll();
    } catch (err) {
      toast.error(t('plugins.toasts.errorTitle'), err instanceof Error ? err.message : t('plugins.toasts.errorDefault'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleHealthCheck = async (pluginId: string) => {
    setActionLoading(pluginId);
    try {
      const result = await pluginsApi.healthCheck(pluginId);
      if (result.healthy) {
        toast.success(t('plugins.toasts.healthOk'), result.message);
      } else {
        toast.warning(t('plugins.toasts.healthFail'), result.message);
      }
    } catch (err) {
      toast.error(t('plugins.toasts.healthError'), err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenConfig = (plugin: Plugin) => {
    setConfigPlugin(plugin);
    setShowConfigModal(true);
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      toast.success(t('plugins.toasts.savedTitle'), t('plugins.toasts.savedDesc'));
      setShowConfigModal(false);
    } catch (err) {
      toast.error(t('plugins.toasts.saveFailed'), err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setSavingConfig(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] w-full items-center justify-center p-8">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  const activeEngine = engines.find(e => e.id === currentEngine);

  return (
    <div className="w-full p-8 max-sm:p-4">
      <PageHeader
        title={t('plugins.title')}
        subtitle={t('plugins.subtitle')}
        actions={
          <button className="btn-secondary" onClick={refetchAll}>
            <RefreshCw size={16} />
            {t('plugins.refresh')}
          </button>
        }
      />

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-300/30 bg-red-50/10 p-4">
          <AlertCircle size={20} className="text-red-500 shrink-0" />
          <span className="text-red-500 text-sm">{error}</span>
        </div>
      )}

      {/* Engine Card */}
      <div className="mb-8 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-emerald-500/10 p-6">
        <div className="flex items-center justify-between max-sm:flex-col max-sm:items-start max-sm:gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
              <Cpu size={24} className="text-primary" />
            </div>
            <div>
              <h3 className="m-0 mb-1 text-lg font-semibold normal-case tracking-normal text-ink">{t('plugins.engineCard')}</h3>
              <span className="text-sm text-primary">{currentEngine}</span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase text-primary before:inline-block before:h-1.5 before:w-1.5 before:rounded-full before:bg-current">
            {t('plugins.running')}
          </span>
        </div>

        {activeEngine && activeEngine.features.length > 0 && (
          <div className="mt-4 border-t border-primary/15 pt-4">
            <p className="mb-2 text-xs uppercase tracking-[0.05em] text-ink-secondary">{t('plugins.supportedFeatures')}</p>
            <div className="flex flex-wrap gap-2">
              {activeEngine.features.slice(0, 8).map(feature => (
                <span key={feature} className="rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">{feature}</span>
              ))}
              {activeEngine.features.length > 8 && (
                <span className="px-2 py-1 text-xs text-ink-muted">{t('plugins.more', { count: activeEngine.features.length - 8 })}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Plugins Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6 max-sm:grid-cols-1">
        {plugins.map(plugin => {
          const TypeIcon = pluginTypeIcons[plugin.type as PluginType] || Puzzle;
          const isLoading = actionLoading === plugin.id;
          const gradient = headerGradients[plugin.type] || 'from-primary to-emerald-500';

          return (
            <div key={plugin.id} className="overflow-hidden rounded-xl border border-border bg-surface transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className={`flex items-center justify-between bg-gradient-to-r ${gradient} px-5 py-4`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                    <TypeIcon size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="m-0 text-base font-semibold normal-case tracking-normal text-white">{plugin.name}</h3>
                    <span className="text-xs text-white/75">v{plugin.version}</span>
                  </div>
                </div>
                {plugin.builtIn && (
                  <span className="rounded-md bg-white/20 px-2 py-1 text-[0.625rem] font-semibold uppercase text-white">
                    {t('plugins.builtIn')}
                  </span>
                )}
              </div>

              <div className="p-5">
                <p className="mb-4 text-sm leading-relaxed text-ink-secondary">{plugin.description || t('plugins.noDescription')}</p>

                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${
                      plugin.status === 'enabled' ? 'bg-primary' :
                      plugin.status === 'disabled' ? 'bg-amber-500' :
                      plugin.status === 'error' ? 'bg-red-500' : 'bg-ink-muted'
                    }`} />
                    <span className="text-sm text-ink">{t(`pluginStatus.${plugin.status}`, { defaultValue: plugin.status })}</span>
                  </div>
                  <span className="text-[0.625rem] uppercase tracking-[0.05em] text-ink-muted">{t(`pluginType.${plugin.type}`, { defaultValue: plugin.type })}</span>
                </div>

                {plugin.error && (
                  <div className="mb-4 rounded-md border border-red-200/20 bg-red-500/10 px-3 py-2">
                    <p className="text-xs text-red-500">{plugin.error}</p>
                  </div>
                )}

                {plugin.provides && plugin.provides.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {plugin.provides.map(item => (
                      <span key={item} className="rounded-md bg-muted px-2 py-1 text-xs text-ink-secondary">{item}</span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 border-t border-border pt-4">
                  {plugin.type === 'engine' ? (
                    (() => {
                      const enginePlugins = plugins.filter(p => p.type === 'engine');
                      const isOnlyEngine = enginePlugins.length === 1;
                      const isActive = plugin.status === 'enabled';

                      if (isOnlyEngine && isActive) {
                        return (
                          <span className="flex flex-1 cursor-default items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/15 px-4 py-[0.625rem] text-sm font-semibold text-emerald-600">
                            <CheckCircle size={16} />
                            {t('plugins.required')}
                          </span>
                        );
                      } else if (isActive) {
                        return (
                          <span className="flex flex-1 cursor-default items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-[0.625rem] text-sm font-medium text-primary">
                            <CheckCircle size={16} />
                            {t('plugins.active')}
                          </span>
                        );
                      } else {
                        return (
                          <button
                            onClick={() => handleToggle(plugin)}
                            disabled={isLoading}
                            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-[0.625rem] text-sm font-medium text-primary transition-all hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <><Power size={16} />{t('plugins.activate')}</>}
                          </button>
                        );
                      }
                    })()
                  ) : (
                    <button
                      onClick={() => handleToggle(plugin)}
                      disabled={isLoading}
                      className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-[0.625rem] text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                        plugin.status === 'enabled'
                          ? 'border-red-400/30 bg-red-500/10 text-red-500 hover:bg-red-500/20'
                          : 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
                      }`}
                    >
                      {isLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : plugin.status === 'enabled' ? (
                        <><PowerOff size={16} />{t('plugins.disable')}</>
                      ) : (
                        <><Power size={16} />{t('plugins.enable')}</>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => handleHealthCheck(plugin.id)}
                    disabled={isLoading}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-muted p-0 transition-all hover:border-ink-muted hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                    title={t('plugins.healthCheck')}
                  >
                    <CheckCircle size={16} className="text-ink-secondary" />
                  </button>

                  <button
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-muted p-0 transition-all hover:border-ink-muted hover:bg-surface"
                    title={t('plugins.configure')}
                    onClick={() => handleOpenConfig(plugin)}
                  >
                    <Settings size={16} className="text-ink-secondary" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {plugins.length === 0 && !loading && (
        <div className="px-8 py-16 text-center">
          <Puzzle size={64} className="mx-auto mb-4 text-ink-muted" />
          <h3 className="mb-2 text-xl text-ink-secondary">{t('plugins.empty.title')}</h3>
          <p className="text-ink-muted">{t('plugins.empty.description')}</p>
        </div>
      )}

      {/* Config Modal */}
      {showConfigModal && configPlugin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease]" onClick={() => setShowConfigModal(false)}>
          <div className="w-[90%] max-w-[500px] animate-[slideUp_0.3s_ease] overflow-hidden rounded-2xl bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 pb-4 pt-6">
              <h2 className="m-0 text-xl font-bold text-ink">{t('plugins.config.title', { name: configPlugin.name })}</h2>
              <button className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-all hover:bg-muted hover:text-ink" onClick={() => setShowConfigModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-6">
              {configPlugin.type === 'engine' ? (
                <>
                  <div className="mb-6 flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-50/10 px-4 py-3 text-sm text-amber-600">
                    <AlertCircle size={16} />
                    <span>{t('plugins.config.restartNotice')}</span>
                  </div>

                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-ink-secondary">{t('plugins.config.engineType')}</label>
                      <select
                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-[0.9375rem] transition-all focus:border-primary focus:bg-surface focus:shadow-[0_0_0_3px_rgba(37,211,102,0.1)] focus:outline-none"
                        value={engineConfig.type}
                        onChange={e => setEngineConfig({ ...engineConfig, type: e.target.value })}
                      >
                        <option value="whatsapp-web.js">WhatsApp Web.js</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-muted p-4">
                      <div className="flex-1">
                        <label className="mb-1 block text-sm font-semibold text-ink-secondary">{t('plugins.config.headless')}</label>
                        <small className="block text-xs text-ink-muted">{t('plugins.config.headlessDesc')}</small>
                      </div>
                      <label className="relative inline-block h-[26px] w-[48px] shrink-0 cursor-pointer">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={engineConfig.headless}
                          onChange={e => setEngineConfig({ ...engineConfig, headless: e.target.checked })}
                        />
                        <span className="absolute inset-0 rounded-[26px] bg-ink-muted transition-all peer-checked:bg-primary" />
                        <span className="absolute bottom-[3px] left-[3px] h-5 w-5 rounded-full bg-white shadow-md transition-all peer-checked:translate-x-[22px]" />
                      </label>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-ink-secondary">{t('plugins.config.sessionDataPath')}</label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-[0.9375rem] transition-all focus:border-primary focus:bg-surface focus:shadow-[0_0_0_3px_rgba(37,211,102,0.1)] focus:outline-none"
                        value={engineConfig.sessionDataPath}
                        onChange={e => setEngineConfig({ ...engineConfig, sessionDataPath: e.target.value })}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-ink-secondary">{t('plugins.config.browserArgs')}</label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-[0.9375rem] transition-all focus:border-primary focus:bg-surface focus:shadow-[0_0_0_3px_rgba(37,211,102,0.1)] focus:outline-none"
                        value={engineConfig.browserArgs}
                        onChange={e => setEngineConfig({ ...engineConfig, browserArgs: e.target.value })}
                        placeholder="--no-sandbox --disable-gpu"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="px-8 py-8 text-center text-ink-muted">
                  <Settings size={48} className="mx-auto opacity-30" />
                  <p className="mt-4">{t('plugins.config.noOptions')}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 pb-6">
              <button className="btn-secondary" onClick={() => setShowConfigModal(false)}>{t('common.cancel')}</button>
              {configPlugin.type === 'engine' && (
                <button className="btn-primary" onClick={handleSaveConfig} disabled={savingConfig}>
                  {savingConfig ? <Loader2 size={16} className="animate-spin" /> : t('plugins.config.save')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
