import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Github, ArrowRight, Wifi, Phone, Lock, Zap, Webhook, ShieldCheck } from 'lucide-react';

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

  const features = [
    { icon: Zap,          label: t('login.feature1') },
    { icon: Webhook,      label: t('login.feature2') },
    { icon: ShieldCheck,  label: t('login.feature3') },
  ];

  return (
    <div className="fixed inset-0 flex min-h-screen animate-[fadeIn_0.25s_ease] bg-[var(--color-muted)]">

      {/* ── Left panel – branding (hidden on small screens) ── */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[var(--color-onyx)] p-10 lg:flex lg:w-[42%]">

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
            <span className="text-[0.75rem] font-semibold uppercase tracking-widest text-[var(--color-primary)]">{t('login.heroTag')}</span>
          </div>
          <h1 className="m-0 mb-4 text-4xl font-extrabold leading-[1.12] tracking-tight text-white">
            {t('login.heroLine1')}<br />
            <span className="text-[var(--color-primary)]">{t('login.heroBrand')}</span><br />
            {t('login.heroLine2')}
          </h1>
          <p className="m-0 mb-7 text-[0.9375rem] leading-relaxed text-white/50">
            {t('login.heroDescription')}
          </p>

          {/* Feature list */}
          <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
            {features.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-white/[0.06] text-[var(--color-primary)]">
                  <Icon size={14} />
                </span>
                <span className="text-[0.875rem] font-medium text-white/70">{label}</span>
              </li>
            ))}
          </ul>
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
      <div className="flex flex-1 flex-col overflow-y-auto bg-[var(--color-surface)] px-6 py-16 dark:bg-[var(--color-muted)]">

        {/* Content – centered as one block in the vertical middle of the panel */}
        <div className="flex w-full flex-1 flex-col items-center justify-center">

        {/* Mobile brand */}
        <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
          <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[var(--color-primary)] shadow-[0_6px_20px_rgba(37,211,102,0.35)]">
            <img src="/openwa_logo.webp" alt="OpenWA" className="h-7 w-7 object-contain brightness-0 invert" />
          </div>
          <span className="text-[1.0625rem] font-bold tracking-tight text-[var(--color-ink)]">{t('common.appName')}</span>
        </div>

        <div className="w-full max-w-[380px] animate-[slideUp_0.35s_ease]">
          <div className="mb-8">
            <h2 className="m-0 mb-1 text-[1.625rem] font-bold tracking-tight text-[var(--color-ink)]">{t('login.title')}</h2>
            <p className="m-0 text-[0.875rem] text-[var(--color-ink-muted)]">{t('login.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

            {/* Phone */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className="text-[0.8125rem] font-semibold text-[var(--color-ink-secondary)]">
                {t('login.phoneLabel')}
              </label>
              <div className="relative">
                <Phone size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] rtl:left-auto rtl:right-3.5" />
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder={t('login.phonePlaceholder')}
                  autoComplete="username"
                  autoFocus
                  className={`input-base pl-10 rtl:pl-3.5 rtl:pr-10 ${error ? 'border-[var(--color-error)] focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]' : ''}`}
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-[0.8125rem] font-semibold text-[var(--color-ink-secondary)]">
                {t('login.passwordLabel')}
              </label>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] rtl:left-auto rtl:right-3.5" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('login.passwordPlaceholder')}
                  autoComplete="current-password"
                  className={`input-base pl-10 pr-11 rtl:pl-11 rtl:pr-10 ${error ? 'border-[var(--color-error)] focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? t('common.hidePassword', { defaultValue: 'Hide password' }) : t('common.showPassword', { defaultValue: 'Show password' })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer border-none bg-transparent p-0.5 text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)] rtl:right-auto rtl:left-3"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-[var(--radius)] px-3.5 py-2.5 text-[0.8125rem] font-medium"
                style={{
                  color: 'var(--color-error)',
                  background: 'color-mix(in srgb, var(--color-error) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-error) 25%, transparent)',
                }}
              >
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
                  <ArrowRight size={16} className="rtl:rotate-180" />
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
        </div>

        {/* Footer */}
        <p className="pt-10 text-center text-[0.75rem] text-[var(--color-ink-muted)]">
          {t('login.footer', { year: new Date().getFullYear(), version: __APP_VERSION__ })}
        </p>
      </div>
    </div>
  );
}
