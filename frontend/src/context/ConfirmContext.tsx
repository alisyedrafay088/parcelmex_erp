import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    const normalized = typeof options === "string" ? { message: options } : options;
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState(normalized);
    });
  }, []);

  function close(result: boolean) {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setState(null);
  }

  const isDanger = state?.danger !== false;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="confirm-overlay" onMouseDown={() => close(false)}>
          <div className="confirm-dialog" onMouseDown={(e) => e.stopPropagation()}>
            <div className={`confirm-dialog-icon${isDanger ? " confirm-dialog-icon-danger" : ""}`}>
              <AlertTriangle size={18} />
            </div>
            <h3 className="confirm-dialog-title">{state.title ?? "Are you sure?"}</h3>
            <p className="confirm-dialog-message">{state.message}</p>
            <div className="confirm-dialog-actions">
              <button type="button" className="confirm-btn confirm-btn-cancel" onClick={() => close(false)}>
                {state.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="button"
                className={`confirm-btn ${isDanger ? "confirm-btn-danger" : "confirm-btn-primary"}`}
                onClick={() => close(true)}
                autoFocus
              >
                {state.confirmLabel ?? "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
