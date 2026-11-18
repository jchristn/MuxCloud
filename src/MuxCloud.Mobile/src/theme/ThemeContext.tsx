import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { dark, light, type Palette } from './palette';

export type ThemePreference = 'system' | 'light' | 'dark';

const ThemeContext = createContext<Palette>(light);

/** Resolves the user's preference (system, light, or dark) into a palette for every screen. */
export function ThemeProvider({ preference, children }: { preference: ThemePreference; children: React.ReactNode }) {
  const system = useColorScheme();
  const palette = useMemo(() => {
    const mode = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
    return mode === 'dark' ? dark : light;
  }, [preference, system]);
  return <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Palette {
  return useContext(ThemeContext);
}
