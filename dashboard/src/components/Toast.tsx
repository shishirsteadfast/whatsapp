import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { Check, X, AlertTriangle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = crypto.randomUUID();
      const newToast = { ...toast, id };
      setToasts(prev => [...prev, newToast]);

      const duration = toast.duration ?? 4000;
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast],
  );

  const success = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'success', title, message });
    },
    [addToast],
  );

  const error = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'error', title, message, duration: 6000 });
    },
    [addToast],
  );

  const warning = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'warning', title, message });
    },
    [addToast],
  );

  const info = useCallback(
    (title: string, message?: string) => {
      addToast({ type: 'info', title, message });
    },
    [addToast],
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

/* ─── Icons & Color Map ────────────────────────────────────────────────────── */

const iconMap: Record<ToastType, typeof Check> = {
  success: Check,
  error: X,
  warning: AlertTriangle,
  info: Info,
};

const colorMap: Record<ToastType, { bg: string; icon: string; border: string; progress: string; title: string; message: string; closeHover: string }> = {
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    icon: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/20',
    border: 'border-emerald-200 dark:border-emerald-800/50',
    progress: 'bg-emerald-500',
    title: 'text-emerald-900 dark:text-emerald-100',
    message: 'text-emerald-700 dark:text-emerald-300/80',
    closeHover: 'hover:bg-emerald-100 dark:hover:bg-emerald-800/30 text-emerald-400 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-200',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-950/40',
    icon: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-500/20',
    border: 'border-red-200 dark:border-red-800/50',
    progress: 'bg-red-500',
    title: 'text-red-900 dark:text-red-100',
    message: 'text-red-700 dark:text-red-300/80',
    closeHover: 'hover:bg-red-100 dark:hover:bg-red-800/30 text-red-400 dark:text-red-500 hover:text-red-700 dark:hover:text-red-200',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    icon: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-500/20',
    border: 'border-amber-200 dark:border-amber-800/50',
    progress: 'bg-amber-500',
    title: 'text-amber-900 dark:text-amber-100',
    message: 'text-amber-700 dark:text-amber-300/80',
    closeHover: 'hover:bg-amber-100 dark:hover:bg-amber-800/30 text-amber-400 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-200',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    icon: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-500/20',
    border: 'border-blue-200 dark:border-blue-800/50',
    progress: 'bg-blue-500',
    title: 'text-blue-900 dark:text-blue-100',
    message: 'text-blue-700 dark:text-blue-300/80',
    closeHover: 'hover:bg-blue-100 dark:hover:bg-blue-800/30 text-blue-400 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-200',
  },
};

/* ─── Single Toast Item ────────────────────────────────────────────────────── */

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const Icon = iconMap[toast.type];
  const colors = colorMap[toast.type];
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const duration = toast.duration ?? 4000;

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleMouseLeave = () => {
    timerRef.current = setTimeout(() => onRemove(toast.id), 2000);
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border ${colors.border} ${colors.bg} shadow-lg shadow-black/5 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-black/8 animate-[slideIn_0.35s_cubic-bezier(0.21,1.02,0.73,1)_forwards]`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Icon with background */}
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${colors.icon}`}>
          <Icon size={17} strokeWidth={2.5} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className={`m-0 text-[0.875rem] font-semibold leading-tight ${colors.title}`}>
            {toast.title}
          </p>
          {toast.message && (
            <p className={`m-0 mt-0.5 text-[0.8125rem] leading-snug ${colors.message}`}>
              {toast.message}
            </p>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={() => onRemove(toast.id)}
          className={`flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent opacity-0 transition-all duration-200 group-hover:opacity-100 ${colors.closeHover}`}
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-[3px] w-full bg-black/5 dark:bg-white/10">
        <div
          className={`h-full ${colors.progress} rounded-full`}
          style={{
            animation: `shrink ${duration}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}

/* ─── Toast Container ──────────────────────────────────────────────────────── */

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex w-[380px] max-w-[calc(100vw-2.5rem)] flex-col gap-2.5 rtl:left-5 rtl:right-auto">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}
