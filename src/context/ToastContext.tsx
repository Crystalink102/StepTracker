import { createContext, useCallback, useContext, useState, useRef, type ReactNode } from 'react';
import Toast, { type ToastType } from '@/src/components/ui/Toast';

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ToastItem | null>(null);
  const queueRef = useRef<ToastItem[]>([]);
  const showingRef = useRef(false);

  const showNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      showingRef.current = false;
      return;
    }

    const next = queueRef.current.shift()!;
    showingRef.current = true;
    setCurrent(next);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const item: ToastItem = { id: nextId++, message, type };

      if (!showingRef.current) {
        showingRef.current = true;
        setCurrent(item);
      } else {
        queueRef.current.push(item);
      }
    },
    [],
  );

  const handleHide = useCallback(() => {
    setCurrent(null);
    // Small delay before showing the next toast so the exit animation finishes
    setTimeout(() => {
      showNext();
    }, 100);
  }, [showNext]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {current && (
        <Toast
          key={current.id}
          message={current.message}
          type={current.type}
          visible
          onHide={handleHide}
        />
      )}
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToastContext must be used within ToastProvider');
  return ctx;
}
