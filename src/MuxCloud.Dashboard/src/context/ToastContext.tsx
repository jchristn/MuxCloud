import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/Icon';
import { errorText } from '../lib/errors';

interface Toast {
  id: number;
  text: string;
  error: boolean;
}

interface ToastValue {
  success: (text: string) => void;
  error: (errorOrText: unknown) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);

  const push = useCallback((text: string, error: boolean) => {
    const id = next.current++;
    setToasts((list) => [...list, { id, text, error }]);
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), error ? 7000 : 4000);
  }, []);

  const value = useMemo<ToastValue>(
    () => ({
      success: (text) => push(text, false),
      error: (errorOrText) => {
        if (typeof errorOrText === 'string') return push(errorOrText, true);
        const e = errorText(errorOrText);
        push(t(e.key, e.values), true);
      },
    }),
    [push, t],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={'toast' + (toast.error ? ' error' : '')}>
            <Icon name={toast.error ? 'alert' : 'check'} size={16} />
            <span>{toast.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside ToastProvider');
  return value;
}
