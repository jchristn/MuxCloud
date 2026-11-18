import { useState, type InputHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';

export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { t } = useTranslation();
  const [shown, setShown] = useState(false);
  const label = shown ? t('common.hidePassword') : t('common.showPassword');
  return (
    <div className="password-wrap">
      <input {...props} className="input" type={shown ? 'text' : 'password'} />
      <button type="button" className="icon-btn sm" onClick={() => setShown(!shown)} aria-label={label} title={label}>
        <Icon name={shown ? 'eyeOff' : 'eye'} size={16} />
      </button>
    </div>
  );
}
