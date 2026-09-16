import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { XIcon } from './icons';

export function ToastHost() {
  const toast = useStore((state) => state.toast);
  const dismissToast = useStore((state) => state.dismissToast);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(dismissToast, toast.actionLabel ? 9000 : 4000);
    return () => window.clearTimeout(timeout);
  }, [toast, dismissToast]);

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-slate-900/90 px-4 py-2.5 text-sm text-white shadow-lg">
        <span>{toast.text}</span>
        {toast.actionLabel && toast.onAction ? (
          <button
            type="button"
            className="font-medium text-brand-200 hover:text-white"
            onClick={() => {
              const action = toast.onAction;
              dismissToast();
              action?.();
            }}
          >
            {toast.actionLabel}
          </button>
        ) : null}
        <button
          type="button"
          aria-label="关闭提示"
          className="text-white/60 hover:text-white"
          onClick={dismissToast}
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
