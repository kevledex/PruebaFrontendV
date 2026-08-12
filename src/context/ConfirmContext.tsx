import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import ConfirmDialog from "../components/ui/ConfirmDialog";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

// Proveedor único, montado una sola vez en la raíz de la app: expone
// "confirm(...)" mediante contexto para que cualquier página pida una
// confirmación (típicamente antes de eliminar algo) sin tener que declarar
// su propio modal ni su propio estado.
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverPendiente = useRef<((resultado: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opciones) => {
    const normalizadas = typeof opciones === "string" ? { message: opciones } : opciones;
    setOptions(normalizadas);
    return new Promise<boolean>((resolve) => {
      resolverPendiente.current = resolve;
    });
  }, []);

  function cerrar(resultado: boolean) {
    setOptions(null);
    resolverPendiente.current?.(resultado);
    resolverPendiente.current = null;
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={options !== null}
        title={options?.title ?? "Confirmar acción"}
        message={options?.message ?? ""}
        confirmLabel={options?.confirmLabel}
        cancelLabel={options?.cancelLabel}
        onConfirm={() => cerrar(true)}
        onCancel={() => cerrar(false)}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const contexto = useContext(ConfirmContext);
  if (!contexto) {
    throw new Error("useConfirm debe usarse dentro de <ConfirmProvider>");
  }
  return contexto;
}
