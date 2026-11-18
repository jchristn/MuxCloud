import { useTheme } from '../context/ThemeContext';

/** The mux wordmark. `onDark` forces the light version (for the dark sidebar). */
export function Logo({
  className,
  onDark = false,
  wordmark = false,
  green = false,
}: {
  className?: string;
  onDark?: boolean;
  /** Use the version cropped tight to the letters, for small placements such as the topbar. */
  wordmark?: boolean;
  /** The brand green wordmark, the same in light and dark (sign-in and other public pages). */
  green?: boolean;
}) {
  const { theme } = useTheme();
  const color = onDark || theme === 'dark' ? 'white' : 'black';
  const src = green ? '/logo-green-wordmark.png' : '/logo-' + color + (wordmark ? '-wordmark' : '') + '.png';
  return <img className={className} src={src} alt="mux" />;
}
