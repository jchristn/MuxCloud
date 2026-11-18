import { useTheme } from '../context/ThemeContext';

/** The mux wordmark. `onDark` forces the light version (for the dark sidebar). */
export function Logo({
  className,
  onDark = false,
  wordmark = false,
}: {
  className?: string;
  onDark?: boolean;
  /** Use the version cropped tight to the letters, for small placements such as the topbar. */
  wordmark?: boolean;
}) {
  const { theme } = useTheme();
  const color = onDark || theme === 'dark' ? 'white' : 'black';
  const src = '/logo-' + color + (wordmark ? '-wordmark' : '') + '.png';
  return <img className={className} src={src} alt="mux" />;
}
