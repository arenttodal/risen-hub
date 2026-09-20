'use client';
import { createContext, useContext, type ReactNode } from 'react';

interface AssistantControls {
  open: () => void;
}

const AssistantContext = createContext<AssistantControls>({ open: () => {} });

export function AssistantProvider({
  value,
  children,
}: {
  value: AssistantControls;
  children: ReactNode;
}) {
  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  return useContext(AssistantContext);
}

/**
 * Lets server-rendered module pages open the assistant panel that lives in the
 * hub layout, without turning the whole page into a client component.
 */
export function AssistantTrigger({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { open } = useAssistant();
  return (
    <button type="button" className={className} onClick={open}>
      {children}
    </button>
  );
}
