import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  User, Key, Settings, Globe, Check, Loader2, Save, Upload, X, Camera, HeartPulse, FileText, ShieldCheck,
} from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../components/Toast';
import { PageHeader } from '../components/PageHeader';
import { useRole } from '../hooks/useRole';
import {
  useProfileQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useSystemSettingsQuery,
  useUpdateSystemSettingsMutation,
  useMessageHealthQuery,
  useTestSendMutation,
  useSystemCheckQuery,
} from '../hooks/queries';
import { uploadApi } from '../services/api';
import { MessageHealthPanel } from '../components/MessageHealth';
import { AuditLogPanel } from '../components/AuditLogPanel';
import { SystemCheckPanel } from '../components/SystemCheck';

// ─── Form Primitives ─────────────────────────────────────────────────────────

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[0.7875rem] font-semibold text-[var(--color-ink-secondary)]">{label}</span>
      {children}
      {hint && <p className="m-0 text-[0.7375rem] text-[var(--color-ink-muted)]">{hint}</p>}
    </div>
  );
}

function FormInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input-base ${props.className ?? ''}`} />;
}

// ─── Image Upload Component ──────────────────────────────────────────────────

function ImageUpload({
  folder,
  value,
  onChange,
  size = 80,
  placeholder,
}: {
  folder: string;
  value: string;
  onChange: (url: string) => void;
  size?: number;
  placeholder: string;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error(t('settings.profile.toasts.uploadError'), 'Only image files are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('settings.profile.toasts.uploadError'), 'File too large. Maximum 5MB');
      return;
    }

    setUploading(true);
    try {
      const result = await uploadApi.upload(folder, file);
      onChange(result.url);
    } catch (err) {
      toast.error(t('settings.profile.toasts.uploadError'), err instanceof Error ? err.message : '');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative shrink-0 cursor-pointer group"
        onClick={() => fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        {value ? (
          <img
            src={value}
            alt=""
            className="rounded-full object-cover border-2 border-[var(--color-border)]"
            style={{ width: size, height: size }}
          />
        ) : (
          <div
            className="flex items-center justify-center rounded-full bg-[var(--color-muted)] border-2 border-dashed border-[var(--color-border)] group-hover:border-[var(--color-primary)] transition-colors"
            style={{ width: size, height: size }}
          >
            {uploading ? (
              <Loader2 size={size / 3} className="animate-spin text-[var(--color-ink-muted)]" />
            ) : (
              <Camera size={size / 3} className="text-[var(--color-ink-muted)]" />
            )}
          </div>
        )}

        {/* Hover overlay */}
        {value && !uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera size={size / 4} className="text-white" />
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />
      </div>

      <div className="flex-1">
        <p className="m-0 text-[0.8125rem] font-medium text-[var(--color-ink)]">{placeholder}</p>
        <p className="m-0 mt-0.5 text-[0.7375rem] text-[var(--color-ink-muted)]">
          {t('settings.profile.profilePicHint')}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            className="btn-secondary !py-1 !px-2.5 !text-[0.75rem]"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={12} />
            {uploading ? t('settings.profile.uploading') : t('settings.profile.chooseFile')}
          </button>
          {value && (
            <button
              type="button"
              className="btn-secondary !py-1 !px-2.5 !text-[0.75rem] !text-red-500 hover:!bg-red-50"
              onClick={handleRemove}
            >
              <X size={12} />
              {t('settings.profile.remove')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Profile ────────────────────────────────────────────────────────────

function ProfileTab() {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: profile } = useProfileQuery();
  const updateProfile = useUpdateProfileMutation();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '');
      setPhone(profile.phone ?? '');
      setProfilePic(profile.profilePic ?? '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateProfile.mutateAsync({
        name: name.trim(),
        phone: phone.trim(),
        profilePic: profilePic || undefined,
      });
      toast.success(t('settings.profile.toasts.updateSuccess'));
    } catch (err) {
      toast.error(t('settings.profile.toasts.updateError'), err instanceof Error ? err.message : '');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-[480px]">
      <ImageUpload
        folder="profile"
        value={profilePic}
        onChange={setProfilePic}
        size={80}
        placeholder={t('settings.profile.profilePic')}
      />

      <Field label={t('settings.profile.name')}>
        <FormInput
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t('settings.profile.namePlaceholder')}
        />
      </Field>

      <Field label={t('settings.profile.phone')}>
        <FormInput
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder={t('settings.profile.phonePlaceholder')}
          type="tel"
        />
      </Field>

      <button className="btn-primary" onClick={handleSave} disabled={saving || !name.trim()}>
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
        {t('common.save')}
      </button>
    </div>
  );
}

// ─── Tab: Password ───────────────────────────────────────────────────────────

function PasswordTab() {
  const { t } = useTranslation();
  const toast = useToast();
  const changePassword = useChangePasswordMutation();

  const [current, setCurrent] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ current?: string; newPw?: string; confirm?: string }>({});

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!current) errs.current = t('settings.password.errors.currentRequired');
    if (!newPw) errs.newPw = t('settings.password.errors.newRequired');
    else if (newPw.length < 6) errs.newPw = t('settings.password.errors.tooShort');
    if (newPw !== confirm) errs.confirm = t('settings.password.errors.mismatch');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await changePassword.mutateAsync({ currentPassword: current, newPassword: newPw });
      toast.success(t('settings.password.toasts.updateSuccess'));
      setCurrent('');
      setNewPw('');
      setConfirm('');
    } catch (err) {
      toast.error(t('settings.password.toasts.updateError'), err instanceof Error ? err.message : '');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-[480px]">
      <Field label={t('settings.password.current')} hint={t('settings.password.currentHint')}>
        <FormInput
          type="password"
          value={current}
          onChange={e => { setCurrent(e.target.value); setErrors(p => ({ ...p, current: undefined })); }}
          placeholder={t('settings.password.currentPlaceholder')}
          className={errors.current ? 'border-[var(--color-error)]' : ''}
        />
        {errors.current && <p className="m-0 text-[0.75rem] font-medium text-[var(--color-error)]">{errors.current}</p>}
      </Field>

      <Field label={t('settings.password.newPassword')}>
        <FormInput
          type="password"
          value={newPw}
          onChange={e => { setNewPw(e.target.value); setErrors(p => ({ ...p, newPw: undefined })); }}
          placeholder={t('settings.password.newPlaceholder')}
          className={errors.newPw ? 'border-[var(--color-error)]' : ''}
        />
        {errors.newPw && <p className="m-0 text-[0.75rem] font-medium text-[var(--color-error)]">{errors.newPw}</p>}
      </Field>

      <Field label={t('settings.password.confirm')}>
        <FormInput
          type="password"
          value={confirm}
          onChange={e => { setConfirm(e.target.value); setErrors(p => ({ ...p, confirm: undefined })); }}
          placeholder={t('settings.password.confirmPlaceholder')}
          className={errors.confirm ? 'border-[var(--color-error)]' : ''}
        />
        {errors.confirm && <p className="m-0 text-[0.75rem] font-medium text-[var(--color-error)]">{errors.confirm}</p>}
      </Field>

      <button className="btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Key size={15} />}
        {t('settings.password.save')}
      </button>
    </div>
  );
}

// ─── Tab: Language ────────────────────────────────────────────────────────────

function LanguageTab() {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'en', flag: '🇬🇧', native: 'English' },
    { code: 'he', flag: '🇮🇱', native: 'עברית' },
    { code: 'zh', flag: '🇨🇳', native: '中文' },
    { code: 'es', flag: '🇪🇸', native: 'Español' },
    { code: 'ar', flag: '🇸🇦', native: 'العربية' },
    { code: 'bn', flag: '🇧🇩', native: 'বাংলা' },
    { code: 'pt', flag: '🇧🇷', native: 'Português' },
    { code: 'id', flag: '🇮🇩', native: 'Bahasa Indonesia' },
    { code: 'ur', flag: '🇵🇰', native: 'اردو' },
    { code: 'ru', flag: '🇷🇺', native: 'Русский' },
    { code: 'de', flag: '🇩🇪', native: 'Deutsch' },
    { code: 'ja', flag: '🇯🇵', native: '日本語' },
    { code: 'it', flag: '🇮🇹', native: 'Italiano' },
  ];

  const currentLang = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];

  return (
    <div className="max-w-[480px]">
      <div className="grid gap-1">
        {languages.map(lang => {
          const isActive = currentLang === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => void i18n.changeLanguage(lang.code)}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-[var(--radius)] border px-4 py-3 text-left text-[0.8375rem] font-medium transition-all ${
                isActive
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-dim)] text-[var(--color-primary)]'
                  : 'border-transparent bg-transparent text-[var(--color-ink-secondary)] hover:border-[var(--color-border)] hover:bg-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              <span className="flex-1"><span className="mr-2">{lang.flag}</span>{lang.native}</span>
              {isActive && <Check size={16} className="shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab: System Settings ────────────────────────────────────────────────────

function SystemTab() {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: settings, isLoading } = useSystemSettingsQuery();
  const updateSettings = useUpdateSystemSettingsMutation();

  const [form, setForm] = useState({
    businessLogo: '',
    smallLogo: '',
    email: '',
    altPhone: '',
    website: '',
    name: '',
    address: '',
    googleMapLink: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        businessLogo: settings.businessLogo ?? '',
        smallLogo: settings.smallLogo ?? '',
        email: settings.email ?? '',
        altPhone: settings.altPhone ?? '',
        website: settings.website ?? '',
        name: settings.name ?? '',
        address: settings.address ?? '',
        googleMapLink: settings.googleMapLink ?? '',
      });
    }
  }, [settings]);

  const set = (key: keyof typeof form, val: string) => {
    setForm(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings.mutateAsync(form);
      toast.success(t('settings.system.toasts.updateSuccess'));
    } catch (err) {
      toast.error(t('settings.system.toasts.updateError'), err instanceof Error ? err.message : '');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="animate-spin text-[var(--color-primary)]" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[560px]">
      {/* Logo uploads */}
      <div className="grid grid-cols-2 gap-6 max-sm:grid-cols-1">
        <ImageUpload
          folder="business-logo"
          value={form.businessLogo}
          onChange={val => set('businessLogo', val)}
          size={80}
          placeholder={t('settings.system.businessLogo')}
        />
        <ImageUpload
          folder="small-logo"
          value={form.smallLogo}
          onChange={val => set('smallLogo', val)}
          size={60}
          placeholder={t('settings.system.smallLogo')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        <Field label={t('settings.system.name')}>
          <FormInput
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder={t('settings.system.namePlaceholder')}
          />
        </Field>

        <Field label={t('settings.system.email')}>
          <FormInput
            type="email"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder={t('settings.system.emailPlaceholder')}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        <Field label={t('settings.system.altPhone')}>
          <FormInput
            value={form.altPhone}
            onChange={e => set('altPhone', e.target.value)}
            placeholder={t('settings.system.altPhonePlaceholder')}
          />
        </Field>

        <Field label={t('settings.system.website')}>
          <FormInput
            value={form.website}
            onChange={e => set('website', e.target.value)}
            placeholder={t('settings.system.websitePlaceholder')}
          />
        </Field>
      </div>

      <Field label={t('settings.system.address')}>
        <FormInput
          value={form.address}
          onChange={e => set('address', e.target.value)}
          placeholder={t('settings.system.addressPlaceholder')}
        />
      </Field>

      <Field label={t('settings.system.googleMapLink')}>
        <FormInput
          value={form.googleMapLink}
          onChange={e => set('googleMapLink', e.target.value)}
          placeholder={t('settings.system.googleMapLinkPlaceholder')}
        />
      </Field>

      <button className="btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
        {t('common.save')}
      </button>
    </div>
  );
}

// ─── Tab: Health Check ────────────────────────────────────────────────────────

function HealthCheckTab() {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: health, isLoading, isFetching, refetch } = useMessageHealthQuery();
  const testSend = useTestSendMutation();
  const [testSendingId, setTestSendingId] = useState<string | null>(null);

  const handleTestSend = async (sessionId: string) => {
    setTestSendingId(sessionId);
    try {
      await testSend.mutateAsync(sessionId);
      toast.success(t('messageHealth.toasts.testSendSuccess'));
    } catch (err) {
      toast.error(t('messageHealth.toasts.testSendError'), err instanceof Error ? err.message : '');
    } finally {
      setTestSendingId(null);
    }
  };

  return (
    <div className="max-w-[640px]">
      <MessageHealthPanel
        sessions={health?.sessions ?? []}
        isLoading={isLoading}
        isFetching={isFetching}
        onRefresh={() => void refetch()}
        onTestSend={handleTestSend}
        testSendingId={testSendingId}
      />
    </div>
  );
}

// ─── Tab: System Requirements ─────────────────────────────────────────────────

function SystemRequirementsTab() {
  const { data: systemCheck, isLoading, isFetching, refetch } = useSystemCheckQuery();

  return (
    <div className="max-w-[640px]">
      <SystemCheckPanel
        checks={systemCheck?.checks ?? []}
        isLoading={isLoading}
        isFetching={isFetching}
        onRefresh={() => void refetch()}
      />
    </div>
  );
}

// ─── Main Settings Page ──────────────────────────────────────────────────────

const TABS = [
  { key: 'profile', icon: User, adminOnly: false },
  { key: 'password', icon: Key, adminOnly: false },
  { key: 'language', icon: Globe, adminOnly: false },
  { key: 'system', icon: Settings, adminOnly: false },
  { key: 'healthCheck', icon: HeartPulse, adminOnly: false },
  { key: 'logs', icon: FileText, adminOnly: false },
  { key: 'systemRequirements', icon: ShieldCheck, adminOnly: true },
] as const;

type SettingsTabKey = (typeof TABS)[number]['key'];

export function SettingsPage() {
  const { t } = useTranslation();
  const { isAdmin } = useRole();
  useDocumentTitle(t('settings.title'));

  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as SettingsTabKey | null;
  const [activeTab, setActiveTab] = useState<SettingsTabKey>(
    tabFromUrl && TABS.some(tab => tab.key === tabFromUrl) ? tabFromUrl : 'profile',
  );

  const visibleTabs = TABS.filter(tab => !tab.adminOnly || isAdmin);

  return (
    <div className="w-full p-7 max-sm:p-4">
      <PageHeader
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
      />

      <div className="flex gap-6 max-sm:flex-col">
        {/* Tab sidebar */}
        <div className="w-[200px] shrink-0 max-sm:w-full">
          <nav className="flex flex-col gap-1 max-sm:flex-row max-sm:overflow-x-auto">
            {visibleTabs.map(({ key, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-[0.8375rem] font-medium transition-all cursor-pointer border-none text-left ${
                  activeTab === key
                    ? 'bg-[var(--color-primary-dim)] text-[var(--color-primary)] font-semibold'
                    : 'bg-transparent text-[var(--color-ink)] hover:bg-[var(--color-muted)]'
                }`}
              >
                <Icon size={16} />
                {t(`settings.tabs.${key}`)}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          <div className="card p-6">
            {activeTab === 'profile' && <ProfileTab />}
            {activeTab === 'password' && <PasswordTab />}
            {activeTab === 'language' && <LanguageTab />}
            {activeTab === 'system' && <SystemTab />}
            {activeTab === 'healthCheck' && <HealthCheckTab />}
            {activeTab === 'systemRequirements' && isAdmin && <SystemRequirementsTab />}
            {activeTab === 'logs' && <AuditLogPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}
