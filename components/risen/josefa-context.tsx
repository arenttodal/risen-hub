'use client';
import { createContext, useContext, type ReactNode } from 'react';

interface JosefaControls {
  open: () => void;
}

const JosefaContext = createContext<JosefaControls>({ open: () => {} });

export function JosefaProvider({ value, children }: { value: JosefaControls; children: ReactNode }) {
  return <JosefaContext.Provider value={value}>{children}</JosefaContext.Provider>;
}

export function useJosefa() {
  return useContext(JosefaContext);
}

/**
 * Lets server-rendered module pages open the Josefa drawer that lives in the
 * hub layout, without turning the whole page into a client component.
 */
export function JosefaTrigger({ className, children }: { className?: string; children: ReactNode }) {
  const { open } = useJosefa();
  return (
    <button type="button" className={className} onClick={open}>
      {children}
    </button>
  );
}
