import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface TopbarSlotValue {
  slot: HTMLElement | null;
  setSlot: (element: HTMLElement | null) => void;
  custom: boolean;
  setCustom: (custom: boolean) => void;
}

const TopbarSlotContext = createContext<TopbarSlotValue | null>(null);

/** Lets a page put its own controls in the shell's single topbar row instead of a second toolbar. */
export function TopbarSlotProvider({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [custom, setCustom] = useState(false);
  return (
    <TopbarSlotContext.Provider value={{ slot, setSlot, custom, setCustom }}>{children}</TopbarSlotContext.Provider>
  );
}

/** The shell side: the element to render the slot into, and whether a page has replaced the title. */
export function useTopbarSlotHost(): { setSlot: (element: HTMLElement | null) => void; custom: boolean } {
  const value = useContext(TopbarSlotContext);
  return { setSlot: value?.setSlot ?? (() => undefined), custom: value?.custom ?? false };
}

/** The page side: renders children in the topbar in place of the page title. */
export function TopbarSlot({ children }: { children: ReactNode }) {
  const value = useContext(TopbarSlotContext);
  const setCustom = value?.setCustom;
  useEffect(() => {
    setCustom?.(true);
    return () => setCustom?.(false);
  }, [setCustom]);
  return value?.slot ? createPortal(children, value.slot) : null;
}
