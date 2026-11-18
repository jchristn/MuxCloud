import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { Icon } from './Icon';

export function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, toggle } = useTheme();
  const label = theme === 'dark' ? t('shell.lightTheme') : t('shell.darkTheme');
  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label={label} title={label}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  );
}
