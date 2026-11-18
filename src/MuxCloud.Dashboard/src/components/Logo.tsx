import { useTheme } from '../context/ThemeContext';

/** The mux wordmark. `onDark` forces the light version (for the dark sidebar). */
export function Logo({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  const { theme } = useTheme();
  const src = onDark || theme === 'dark' ? '/logo-white.png' : '/logo-black.png';
  return <img className={className} src={src} alt="mux" />;
}
