import type { ReactNode } from 'react';
import { Link } from 'react-router';

export function Kpi({
  label,
  value,
  to,
  tone,
}: {
  label: string;
  value: ReactNode;
  to?: string;
  tone?: 'danger' | 'warning' | 'success';
}) {
  const color = tone ? { color: 'var(--color-' + tone + ')' } : undefined;
  const body = (
    <>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value" style={color}>
        {value}
      </span>
    </>
  );
  return to ? (
    <Link className="kpi" to={to}>
      {body}
    </Link>
  ) : (
    <div className="kpi">{body}</div>
  );
}
