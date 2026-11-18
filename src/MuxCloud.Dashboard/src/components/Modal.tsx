import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

interface ModalProps {
  title: ReactNode;
  subtitle?: ReactNode;
  size?: ModalSize;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Blocking modals ignore backdrop clicks and Escape (for in-flight destructive work). */
  blocking?: boolean;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Dialog rendered in a portal: locks body scroll, traps focus, closes on Escape and backdrop click. */
export function Modal({ title, subtitle, size = 'md', onClose, children, footer, blocking = false }: ModalProps) {
  const { t } = useTranslation();
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first =
      panel.current?.querySelector<HTMLElement>('[data-autofocus]') ??
      panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !blocking) {
        event.stopPropagation();
        onCloseRef.current();
      }
      if (event.key === 'Tab' && panel.current) {
        const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (!items.length) return;
        const firstItem = items[0];
        const lastItem = items[items.length - 1];
        if (event.shiftKey && document.activeElement === firstItem) {
          event.preventDefault();
          lastItem.focus();
        } else if (!event.shiftKey && document.activeElement === lastItem) {
          event.preventDefault();
          firstItem.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [blocking]);

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !blocking) onClose();
      }}
    >
      <div ref={panel} className={'modal ' + size} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-header">
          <div style={{ minWidth: 0 }}>
            <h2 id={titleId}>{title}</h2>
            {subtitle ? <div className="subtitle">{subtitle}</div> : null}
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label={t('modal.close')}
            title={t('modal.close')}
            disabled={blocking}
          >
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
