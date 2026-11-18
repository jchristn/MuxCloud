import { useId, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { CopyButton } from './CopyButton';

/** A titled section that folds, with an optional copy button for its content. */
export function Collapsible({
  title,
  children,
  copyValue,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  copyValue?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="collapsible">
      <div className="collapsible-head">
        <button type="button" className="toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
          <Icon name={open ? 'chevronDown' : 'chevronRight'} size={16} className={open ? undefined : 'flip-rtl'} />
          {title}
        </button>
        <span className="spacer" />
        {copyValue !== undefined ? <CopyButton value={copyValue} label={title} /> : null}
      </div>
      {open ? (
        <div className="collapsible-body" id={id}>
          {children}
        </div>
      ) : null}
    </section>
  );
}
