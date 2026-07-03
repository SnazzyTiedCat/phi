"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

/**
 * SidebarContext — the open/closed state of the app shell's left sidebar.
 *
 * It lives in a context (not local state in one component) because TWO separate,
 * non-adjacent components need it: the floating toggle button in the top-left
 * corner, and the Sidebar panel itself (plus its backdrop). Lifting the state to
 * a provider wrapped around the whole authenticated app lets both read and flip
 * it without prop-drilling through the server layout.
 *
 *   isOpen — is the panel showing
 *   toggle — flip it (the corner button)
 *   close  — force-close it (backdrop click, or after navigating to a material)
 */
type SidebarContextValue = {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  // useCallback so the function identities are stable across renders — consumers
  // can depend on them without re-running effects.
  const toggle = useCallback(() => setIsOpen((open) => !open), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <SidebarContext.Provider value={{ isOpen, toggle, close }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return ctx;
}
