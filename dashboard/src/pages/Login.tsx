import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Github, ArrowRight, Wifi } from 'lucide-react';

interface LoginProps {
  onLogin: (token: string, role: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const { t } = useTranslation();
  const [phone, setPhone]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim())    { setError(t('login.phoneRequired')); return; }
    if (!password.trim()) { setError(t('login.passwordRequired')); return; }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), password }),
      });

      if (response.ok) {
        const data = await response.json() as { access_token: string; user: { role: string } };
        onLogin(data.access_token, data.user.role);
      } else {
        const err = await response.json().catch(() => ({})) as { message?: string };
        setError(err.message || t('login.invalidCredentials'));
      }
    } catch {
      setError(t('login.connectionError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex min-h-screen bg-[var(--color-muted)]">

      {/* ── Left panel – branding (hidden on small screens) ── */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[var(--color-ink)] p-10 lg:flex lg:w-[42%]">

        {/* Subtle grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />

        {/* Green glow */}
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-[420px] w-[420px] rounded-full bg-[var(--color-primary)] opacity-[0.12] blur-[80px]" />
        <div className="pointer-events-none absolute -right-16 top-16 h-[280px] w-[280px] rounded-full bg-[var(--color-primary)] opacity-[0.07] blur-[60px]" />

        {/* Brand mark */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--color-primary)]">
            <img src="/openwa_logo.webp" alt="OpenWA" className="h-6 w-6 object-contain brightness-0 invert" />
          </div>
          <div>
            <p className="m-0 text-[0.9375rem] font-bold leading-tight text-white">{t('common.appName')}</p>
            <p className="m-0 text-[0.65rem] uppercase tracking-widest text-white/40">{t('common.appSubtitle')}</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative">
          <div className="mb-5 flex items-center gap-2">
            <Wifi size={16} className="text-[var(--color-primary)]" />
            <span className="text-[0.75rem] font-semibold uppercase tracking-widest text-[var(--color-primary)]">WhatsApp Gateway</span>
          </div>
          <h1 className="m-0 mb-4 text-4xl font-extrabold leading-[1.12] tracking-tight text-white">
            Manage your<br />
            <span className="text-[var(--color-primary)]">WhatsApp</span><br />
            sessions easily.
          </h1>
          <p className="m-0 text-[0.9375rem] leading-relaxed text-white/50">
            A self-hosted gateway to automate, monitor and scale your WhatsApp integrations with full control.
          </p>
        </div>

        {/* Footer */}
        <div className="relative flex items-center justify-between">
          <span className="text-[0.75rem] text-white/30">
            {t('login.version', { version: __APP_VERSION__, date: new Date(__BUILD_TIME__).toLocaleDateString() })}
          </span>
          <a
            href="https://github.com/rmyndharis/OpenWA"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/30 transition-colors hover:text-white/70 no-underline"
          >
            <Github size={16} />
          </a>
        </div>
      </div>

      {/* ── Right panel – form ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">

        {/* Mobile brand */}
        <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
          <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[var(--color-primary)] shadow-[0_6px_20px_rgba(37,211,102,0.35)]">
            <img src="/openwa_logo.webp" alt="OpenWA" className="h-7 w-7 object-contain brightness-0 invert" />
          </div>
          <span className="text-[1.0625rem] font-bold tracking-tight text-[var(--color-ink)]">{t('common.appName')}</span>
        </div>

        <div className="w-full max-w-[380px]">
          <div className="mb-8">
            <h2 className="m-0 mb-1 text-[1.625rem] font-bold tracking-tight text-[var(--color-ink)]">{t('login.title')}</h2>
            <p className="m-0 text-[0.875rem] text-[var(--color-ink-muted)]">{t('login.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Phone */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className="text-[0.8125rem] font-semibold text-[var(--color-ink-secondary)]">
                {t('login.phoneLabel')}
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder={t('login.phonePlaceholder')}
                autoComplete="username"
                className={`input-base ${error ? 'border-[var(--color-error)] focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]' : ''}`}
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-[0.8125rem] font-semibold text-[var(--color-ink-secondary)]">
                {t('login.passwordLabel')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('login.passwordPlaceholder')}
                  autoComplete="current-password"
                  className={`input-base pr-11 ${error ? 'border-[var(--color-error)] focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer border-none bg-transparent p-0.5 text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-[var(--radius)] border border-red-200 bg-red-50 px-3.5 py-2.5 text-[0.8125rem] font-medium text-red-600 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary mt-1 w-full justify-center py-3 text-[0.9375rem]"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t('login.connecting')}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {t('login.signIn')}
                  <ArrowRight size={16} />
                </span>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-[0.8125rem] text-[var(--color-ink-muted)]">
            {t('login.help')}{' '}
            <a
              href="https://github.com/rmyndharis/OpenWA/blob/main/docs/01-project-overview.md"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[var(--color-primary)] no-underline hover:underline"
            >
              {t('login.viewDocs')}
            </a>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-auto pt-10 text-center text-[0.75rem] text-[var(--color-ink-muted)]">
          {t('login.footer')}
        </p>
      </div>
    </div>
  );
}
