import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';

/** Copy a value. Shows a check for 1.5 seconds; the button keeps its size so nothing shifts. */
export function CopyButton({ value, label, className }: { value: string; label?: string; className?: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const text = copied ? t('common.copied') : label ? t('common.copyValue', { label }) : t('common.copy');
  return (
    <button
      type="button"
      className={'copy-btn' + (copied ? ' copied' : '') + (className ? ' ' + className : '')}
      aria-label={text}
      title={text}
      data-ignore-row-click
      onClick={async (event) => {
        event.stopPropagation();
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          const area = document.createElement('textarea');
          area.value = value;
          document.body.appendChild(area);
          area.select();
          document.execCommand('copy');
          area.remove();
        }
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1500);
      }}
    >
      <Icon name={copied ? 'check' : 'copy'} size={14} />
    </button>
  );
}

/** An ID or other technical value with a copy button; the full value is in the tooltip. */
export function CopyableId({ value, label }: { value: string; label?: string }) {
  return (
    <span className="copyable" title={value}>
      <span className="value">{value}</span>
      <CopyButton value={value} label={label} />
    </span>
  );
}
