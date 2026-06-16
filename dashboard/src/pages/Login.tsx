import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Github } from 'lucide-react';

interface LoginProps {
  onLogin: (token: string, role: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) { setError('Phone number is required'); return; }
    if (!password.trim()) { setError('Password is required'); return; }

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
        setError(err.message || 'Invalid phone or password');
      }
    } catch {
      setError(t('login.connectionError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-muted p-8">
      <div className="w-full max-w-[420px] rounded-xl bg-surface p-12 text-center shadow-lg">
        <div className="mb-6 flex flex-col items-center justify-center gap-2">
          <img src="/openwa_logo.webp" alt="OpenWA" className="h-[127px] w-[127px] object-contain" />
          <span className="text-xs font-medium text-ink-muted">
            {t('login.version', {
              version: __APP_VERSION__,
              date: new Date(__BUILD_TIME__).toLocaleDateString(),
            })}
          </span>
        </div>
        <form onSubmit={handleSubmit} className="text-left">
          <div className="mb-6">
            <label htmlFor="phone" className="mb-2 block text-sm font-medium text-ink">Phone Number</label>
            <div className="relative">
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. 01712345678"
                className={`w-full rounded-[var(--radius)] border bg-surface px-4 py-3 pr-12 text-base text-ink transition-colors placeholder:text-ink-muted focus:border-primary focus:shadow-[0_0_0_3px_rgba(37,211,102,0.1)] focus:outline-none ${error ? 'border-error' : 'border-border'}`}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-ink">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                className={`w-full rounded-[var(--radius)] border bg-surface px-4 py-3 pr-12 text-base text-ink transition-colors placeholder:text-ink-muted focus:border-primary focus:shadow-[0_0_0_3px_rgba(37,211,102,0.1)] focus:outline-none ${error ? 'border-error' : 'border-border'}`}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer border-none bg-transparent p-1 text-ink-muted hover:text-ink-secondary"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {error && <span className="mt-2 block text-sm text-error">{error}</span>}
          </div>

          <button
            type="submit"
            className="w-full cursor-pointer rounded-[var(--radius)] border-none bg-primary px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isLoading}
          >
            {isLoading ? t('login.connecting') : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-sm text-ink-secondary">
          {t('login.help')}{' '}
          <a href="https://github.com/rmyndharis/OpenWA/blob/main/docs/01-project-overview.md" target="_blank" rel="noopener noreferrer" className="font-medium text-primary no-underline hover:underline">
            {t('login.viewDocs')}
          </a>
        </p>
      </div>

      <footer className="mt-8 flex flex-col items-center gap-3 text-center text-xs text-ink-muted">
        <span>{t('login.footer')}</span>
        <a href="https://github.com/rmyndharis/OpenWA" target="_blank" rel="noopener noreferrer" className="text-ink-muted transition-colors hover:text-primary">
          <Github size={18} />
        </a>
      </footer>
    </div>
  );
}
