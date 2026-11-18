import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';

export interface MenuItem {
  label: string;
  icon?: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
  checked?: boolean;
}

/** A menu anchored to a trigger, rendered in a portal so table scroll containers never clip it. */
export function ActionMenu({
  items,
  label,
  trigger,
  keepOpen = false,
}: {
  items: MenuItem[];
  label?: string;
  trigger?: ReactNode;
  keepOpen?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const name = label ?? t('common.moreActions');

  const place = () => {
    if (!button.current) return;
    const rect = button.current.getBoundingClientRect();
    const width = menu.current?.offsetWidth ?? 200;
    const height = menu.current?.offsetHeight ?? 200;
    const rtl = document.documentElement.dir === 'rtl';
    let left = rtl ? rect.left : rect.right - width;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    let top = rect.bottom + 4;
    if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 4);
    setPosition({ top, left });
  };

  useLayoutEffect(() => {
    if (open) place();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (menu.current?.contains(event.target as Node) || button.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const buttons = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? []);
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next =
          event.key === 'ArrowDown' ? (index + 1) % buttons.length : (index - 1 + buttons.length) % buttons.length;
        buttons[next]?.focus();
        event.preventDefault();
      }
    };
    // Follow the trigger when a container that holds it scrolls; close once the trigger leaves the viewport.
    const onScroll = (event: Event) => {
      const target = event.target;
      if (!(target === document || (target instanceof Node && button.current && target.contains(button.current))))
        return;
      const rect = button.current?.getBoundingClientRect();
      if (!rect || rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth)
        setOpen(false);
      else place();
    };
    const onResize = () => setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    const focusTimer = setTimeout(
      () => menu.current?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus({ preventScroll: true }),
      0,
    );
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={button}
        type="button"
        className={trigger ? 'btn btn-sm' : 'icon-btn sm'}
        aria-label={name}
        title={name}
        aria-haspopup="menu"
        aria-expanded={open}
        data-ignore-row-click
        onClick={(event) => {
          event.stopPropagation();
          setOpen(!open);
        }}
      >
        {trigger ?? <Icon name="more" />}
      </button>
      {open
        ? createPortal(
            <div
              ref={menu}
              className="menu"
              role="menu"
              style={{ top: position?.top ?? -9999, left: position?.left ?? -9999 }}
              data-ignore-row-click
            >
              {items.map((item, index) => (
                <div key={index}>
                  {item.separatorBefore ? <hr /> : null}
                  <button
                    type="button"
                    role={item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
                    aria-checked={item.checked}
                    className={item.danger ? 'danger' : undefined}
                    disabled={item.disabled}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!keepOpen) setOpen(false);
                      item.onSelect();
                    }}
                  >
                    {item.checked !== undefined ? (
                      <span className="menu-check">{item.checked ? <Icon name="check" size={14} /> : null}</span>
                    ) : item.icon ? (
                      <Icon name={item.icon} size={15} />
                    ) : null}
                    {item.label}
                  </button>
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
