import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccount } from '@/state/AccountContext';
import { Notice } from './ui';

/**
 * Shown while the live account events socket is down (Mux Cloud unreachable or restarting), after a short grace period
 * so routine reconnects do not flash it. Without it, machine status would look current when it is not.
 */
export function ConnectionBanner() {
  const { t } = useTranslation();
  const { liveState, loading } = useAccount();
  const down = !loading && liveState !== 'open';
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!down) {
      const clear = setTimeout(() => setShow(false), 0);
      return () => clearTimeout(clear);
    }
    const timer = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(timer);
  }, [down]);

  if (!show || !down) return null;
  return <Notice tone="warning" text={t('mobile.machine.liveDown')} />;
}
