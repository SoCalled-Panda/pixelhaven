import { createContext } from 'react';

export interface ToastInfo {
  id: number;
  message: string;
  tone?: 'info' | 'success' | 'warning' | 'error';
  action?: { label: string; onClick: () => void };
  duration?: number;
}

export type ToastItem = ToastInfo;

export const MAX_VISIBLE = 3;

export interface ToastOptions {
  message: string;
  tone?: ToastInfo['tone'];
  action?: { label: string; onClick: () => void };
  duration?: number;
}

export interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);