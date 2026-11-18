import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function Banner({
  tone = 'info',
  title,
  children,
  icon,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success';
  title?: ReactNode;
  children?: ReactNode;
  icon?: string;
}) {
  return (
    <div className={'banner banner-' + tone} role={tone === 'danger' ? 'alert' : undefined}>
      <Icon name={icon ?? (tone === 'success' ? 'check' : tone === 'info' ? 'info' : 'alert')} />
      <div className="banner-body">
        {title ? <span className="banner-title">{title}</span> : null}
        {children}
      </div>
    </div>
  );
}
