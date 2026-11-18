import { createContext, useContext, useCallback, useRef, useState, useMemo, type ReactNode } from 'react';

/**
 * Toast types. Kept separate from toastContext.tsx so that toastContext.tsx
 * only exports the <audioContext> and <ToastProvider> components, as required
 * by React Fast Refresh.
 */
export interface ToastInfo {
  id: number;
  message: string;
  tone?: 'info' | 'success' | 'warning' | 'error';
  action?: { label: string; onClick: () => void };
  /** Override auto-dismiss duration (ms). Errors stay longer. */
  duration?: number;
}

export type ToastItem = ToastInfo;

export const MAX_VISIBLE = 3;

export interface ToastOptions {
  message: string;
  tone?: ToastInfo['tone'];
  action?: { label: string; onClick: () => void };
  /** Override auto-dismiss duration (ms). Errors stay longer. */
  duration?: number;
}

export interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return ctx;
}

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(1);
  const timersRef = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (options: ToastOptions) => {
      const id = nextIdRef.current++;
      setItems((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { ...options, id }]);
      const duration = options.duration ?? (options.tone === 'error' ? 6500 : 4200);
      const timer = window.setTimeout(() => dismiss(id), duration);
      timersRef.current.set(id, timer);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={`toast toast--${item.tone ?? 'info'}`}>
            <span>{item.message}</span>
            {item.action && (
              <button
                type="button"
                className="toast__action"
                onClick={() => {
                  item.action!.onClick();
                  dismiss(item.id);
                }}
              >
                {item.action.label}
              </button>
            )}
            <button
              type="button"
              className="toast__dismiss"
              aria-label="Dismiss notification"
              onClick={() => dismiss(item.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}