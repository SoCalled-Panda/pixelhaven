/**
 * Toast types. Kept in a separate file so toastContext.tsx can export only
 * the <audioContext> and <ToastProvider> components, as required by React
 * Fast Refresh.
 */
export type ToastInfo = {
  id: number;
  message: string;
  tone?: 'info' | 'success' | 'warning' | 'error';
  action?: { label: string; onClick: () => void };
  /** Override auto-dismiss duration (ms). Errors stay longer. */
  duration?: number;
};

export type ToastItem = ToastInfo;

export interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

export const MAX_VISIBLE = 3;

export interface ToastOptions {
  message: string;
  tone?: ToastInfo['tone'];
  action?: { label: string; onClick: () => void };
  /** Override auto-dismiss duration (ms). Errors stay longer. */
  duration?: number;
}