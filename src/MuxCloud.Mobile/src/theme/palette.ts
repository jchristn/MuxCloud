/** Mux brand colors, taken from the mux local dashboard and the Mux Cloud dashboard (same tokens in both themes). */
export interface Palette {
  dark: boolean;
  bg: string;
  panel: string;
  panelAlt: string;
  line: string;
  text: string;
  muted: string;
  accent: string;
  accentStrong: string;
  accentSoft: string;
  onAccent: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  info: string;
  success: string;
  successSoft: string;
  codeBg: string;
}

export const light: Palette = {
  dark: false,
  bg: '#f6f7f8',
  panel: '#ffffff',
  panelAlt: '#eef2f5',
  line: '#d7dde3',
  text: '#1f252b',
  muted: '#5d6974',
  accent: '#167a5b',
  accentStrong: '#0f6248',
  accentSoft: '#e2f2ec',
  onAccent: '#ffffff',
  danger: '#c2413a',
  dangerSoft: '#fbe9e7',
  warning: '#8a6206',
  warningSoft: '#fbf1d8',
  info: '#2f6fb0',
  success: '#167a5b',
  successSoft: '#e2f2ec',
  codeBg: '#eef2f5',
};

export const dark: Palette = {
  dark: true,
  bg: '#101418',
  panel: '#171d23',
  panelAlt: '#202832',
  line: '#303a45',
  text: '#eef3f8',
  muted: '#9aa7b4',
  accent: '#39a37f',
  accentStrong: '#2b8567',
  accentSoft: '#173a2f',
  onAccent: '#08130f',
  danger: '#f26b61',
  dangerSoft: '#3a1d1b',
  warning: '#e0a83a',
  warningSoft: '#3a2e12',
  info: '#5aa0e0',
  success: '#39a37f',
  successSoft: '#173a2f',
  codeBg: '#0c1014',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 6, md: 10, lg: 14, pill: 999 };
export const font = { small: 13, body: 15, title: 17, heading: 22, mono: 13 };
