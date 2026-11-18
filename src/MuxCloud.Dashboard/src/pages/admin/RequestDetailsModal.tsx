import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { requestHistoryApi } from '../../api';
import { api } from '../../apiClient';
import { MethodBadge, StatusCodeBadge } from '../../components/Badges';
import { CodeBlock } from '../../components/CodeBlock';
import { Collapsible } from '../../components/Collapsible';
import { CopyableId } from '../../components/CopyButton';
import { ErrorBanner } from '../../components/ErrorBanner';
import { Modal } from '../../components/Modal';
import { Loading } from '../../components/Spinner';
import { useLocale } from '../../i18n/runtime';
import { formatBytes, formatDateTime, formatDuration } from '../../lib/format';
import { headerEntries } from '../../lib/headers';
import type { RequestHistoryDetail, RequestHistoryEntry } from '../../types';

function Headers({ headers }: { headers?: Record<string, string> | string }) {
  const { t } = useTranslation();
  const entries = headerEntries(headers);
  if (!entries.length) return <p className="small muted">{t('requests.noHeaders')}</p>;
  return (
    <dl className="kv mono">
      {entries.map(([k, v]) => (
        <div key={k} style={{ display: 'contents' }}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Body({
  body,
  truncated,
  bytes,
  relay,
}: {
  body?: string;
  truncated?: boolean;
  bytes?: number;
  relay?: boolean;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  if (relay) return <p className="small muted">{t('requests.relayNoBody')}</p>;
  if (!body) return <p className="small muted">{t('requests.noBody')}</p>;
  return (
    <>
      {truncated ? (
        <p className="small" style={{ color: 'var(--color-warning)' }}>
          {t('requests.truncated', {
            size: formatBytes(locale, body.length) + (bytes ? ' / ' + formatBytes(locale, bytes) : ''),
          })}
        </p>
      ) : null}
      <CodeBlock text={body} pretty />
    </>
  );
}

/** Request inspector: metadata, headers, bodies, and raw JSON, each collapsible with copy. */
export function RequestDetailsModal({ entry, onClose }: { entry: RequestHistoryEntry; onClose: () => void }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const [detail, setDetail] = useState<RequestHistoryDetail | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    requestHistoryApi.get(api, entry.id).then(setDetail).catch(setError);
  }, [entry.id]);

  const d = detail ?? entry;
  return (
    <Modal
      size="xl"
      title={
        <span className="row">
          <MethodBadge method={d.method} />
          <span className="mono" style={{ overflowWrap: 'anywhere' }}>
            {d.path}
          </span>
        </span>
      }
      subtitle={<CopyableId value={d.id} />}
      onClose={onClose}
    >
      {error ? <ErrorBanner error={error} /> : null}
      {!detail && !error ? <Loading /> : null}
      <Collapsible title={t('requests.sectionMetadata')} copyValue={JSON.stringify(entry, null, 2)}>
        <dl className="kv">
          <dt>{t('common.status')}</dt>
          <dd>
            <StatusCodeBadge code={d.statusCode} />
          </dd>
          <dt>{t('requests.duration')}</dt>
          <dd>{formatDuration(locale, d.durationMs)}</dd>
          <dt>{t('common.created')}</dt>
          <dd>{formatDateTime(locale, d.createdUtc)}</dd>
          {d.completedUtc ? (
            <>
              <dt>{t('requests.completed')}</dt>
              <dd>{formatDateTime(locale, d.completedUtc)}</dd>
            </>
          ) : null}
          <dt>{t('requests.sourceIp')}</dt>
          <dd className="mono">{d.sourceIp ?? ''}</dd>
          <dt>{t('requests.colUser')}</dt>
          <dd className="mono">{d.userId ?? ''}</dd>
          <dt>{t('requests.tenant')}</dt>
          <dd className="mono">{d.tenantId ?? ''}</dd>
          <dt>{t('requests.colSize')}</dt>
          <dd>
            {formatBytes(locale, d.requestBytes ?? 0)} / {formatBytes(locale, d.responseBytes ?? 0)}
          </dd>
          {d.isRelay ? (
            <>
              <dt>{t('requests.relay')}</dt>
              <dd>
                <span className="pill pill-info">{t('requests.relay')}</span>
              </dd>
            </>
          ) : null}
        </dl>
      </Collapsible>
      {detail ? (
        <>
          <Collapsible
            title={t('requests.sectionRequestHeaders')}
            copyValue={JSON.stringify(Object.fromEntries(headerEntries(detail.requestHeaders)), null, 2)}
          >
            <Headers headers={detail.requestHeaders} />
          </Collapsible>
          <Collapsible title={t('requests.sectionRequestBody')} copyValue={detail.requestBody ?? ''}>
            <Body
              body={detail.requestBody}
              truncated={detail.requestBodyTruncated}
              bytes={detail.requestBytes}
              relay={detail.isRelay}
            />
          </Collapsible>
          <Collapsible
            title={t('requests.sectionResponseHeaders')}
            copyValue={JSON.stringify(Object.fromEntries(headerEntries(detail.responseHeaders)), null, 2)}
          >
            <Headers headers={detail.responseHeaders} />
          </Collapsible>
          <Collapsible title={t('requests.sectionResponseBody')} copyValue={detail.responseBody ?? ''}>
            <Body
              body={detail.responseBody}
              truncated={detail.responseBodyTruncated}
              bytes={detail.responseBytes}
              relay={detail.isRelay}
            />
          </Collapsible>
          <Collapsible title={t('requests.sectionRaw')} copyValue={JSON.stringify(detail, null, 2)} defaultOpen={false}>
            <CodeBlock text={JSON.stringify(detail, null, 2)} />
          </Collapsible>
        </>
      ) : null}
    </Modal>
  );
}
