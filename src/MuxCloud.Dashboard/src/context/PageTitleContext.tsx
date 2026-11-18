import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

interface TitleValue {
  title: string;
  setTitle: (title: string) => void;
}

const PageTitleContext = createContext<TitleValue | null>(null);

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState('');
  useDocumentTitle(title);
  return <PageTitleContext.Provider value={{ title, setTitle }}>{children}</PageTitleContext.Provider>;
}

/** Set the topbar title and document.title for the current page. */
export function usePageTitle(title: string): void {
  const value = useContext(PageTitleContext);
  useEffect(() => {
    value?.setTitle(title);
  }, [title, value]);
}

export function useCurrentTitle(): string {
  return useContext(PageTitleContext)?.title ?? '';
}
