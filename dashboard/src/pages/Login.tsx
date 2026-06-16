import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Github } from 'lucide-react';
import './Login.css';

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
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <img src="/openwa_logo.webp" alt="OpenWA" className="logo-icon" />
          <span className="version-info">
            {t('login.version', {
              version: __APP_VERSION__,
              date: new Date(__BUILD_TIME__).toLocaleDateString(),
            })}
          </span>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="phone">Phone Number</label>
            <div className="input-wrapper">
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. 01712345678"
                className={error ? 'error' : ''}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                className={error ? 'error' : ''}
                autoComplete="current-password"
              />
              <button type="button" className="toggle-visibility" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {error && <span className="error-message">{error}</span>}
          </div>

          <button type="submit" className="connect-btn" disabled={isLoading}>
            {isLoading ? t('login.connecting') : 'Sign In'}
          </button>
        </form>

        <p className="login-help">
          {t('login.help')}{' '}
          <a href="https://github.com/rmyndharis/OpenWA/blob/main/docs/01-project-overview.md" target="_blank" rel="noopener noreferrer">
            {t('login.viewDocs')}
          </a>
        </p>
      </div>

      <footer className="login-footer">
        <span>{t('login.footer')}</span>
        <a href="https://github.com/rmyndharis/OpenWA" target="_blank" rel="noopener noreferrer" className="github-link">
          <Github size={18} />
        </a>
      </footer>
    </div>
  );
}
