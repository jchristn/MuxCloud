import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../apiClient';
import type { RawResult } from '../../api';
import { MethodBadge } from '../../components/Badges';
import { CodeBlock } from '../../components/CodeBlock';
import { ConfirmModal } from '../../components/ConfirmModal';
import { CopyButton } from '../../components/CopyButton';
import { ErrorBanner } from '../../components/ErrorBanner';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/PageHeader';
import { Loading } from '../../components/Spinner';
import { usePageTitle } from '../../context/PageTitleContext';
import { usePersistentState } from '../../hooks/usePersistentState';
import { useLocale } from '../../i18n/runtime';
import { formatBytes, formatDuration, formatRelativeTime } from '../../lib/format';
import {
  csharpSnippet,
  curlSnippet,
  fetchSnippet,
  flattenOpenApi,
  resolvePath,
  type OpenApiOperation,
} from '../../lib/openapi';

interface HistoryItem {
  key: string;
  method: string;
  url: string;
  status: number;
  at: string;
}

export function ExplorerPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  usePageTitle(t('explorer.title'));
  const [ops, setOps] = useState<OpenApiOperation[] | null>(null);
  const [specError, setSpecError] = useState<unknown>(null);
  const [selectedKey, setSelectedKey] = usePersistentState<string>('muxcloud.explorer.selected', '');
  const [values, setValues] = useState<Record<string, string>>({});
  const [headers, setHeaders] = useState<Array<{ name: string; value: string }>>([]);
  const [body, setBody] = useState('');
  const [bodyError, setBodyError] = useState('');
  const [result, setResult] = useState<RawResult | null>(null);
  const [runError, setRunError] = useState<unknown>(null);
  const [running, setRunning] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [tab, setTab] = useState<'body' | 'headers' | 'code'>('body');
  const [history, setHistory] = usePersistentState<HistoryItem[]>('muxcloud.explorer.history', []);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    api
      .raw('GET', '/openapi.json', null, {})
      .then((r) => {
        if (r.status !== 200) throw new Error('HTTP ' + r.status);
        setOps(flattenOpenApi(JSON.parse(r.bodyText), t('common.unknown')));
      })
      .catch((e) => setSpecError(e));
  }, [t]);

  const selected = ops?.find((o) => o.key === selectedKey) ?? null;
  useEffect(() => {
    setValues({});
    setHeaders([]);
    setBody(selected?.bodyExample ?? '');
    setBodyError('');
    setResult(null);
    setRunError(null);
  }, [selectedKey, selected?.bodyExample]);

  const grouped = useMemo(() => {
    const map = new Map<string, OpenApiOperation[]>();
    for (const op of ops ?? []) map.set(op.tag, [...(map.get(op.tag) ?? []), op]);
    return Array.from(map.entries());
  }, [ops]);

  const path = selected ? resolvePath(selected, values) : '';
  const url = window.location.origin + path;
  const headerMap = Object.fromEntries(headers.filter((h) => h.name.trim()).map((h) => [h.name.trim(), h.value]));
  const sendsBody = !!selected && selected.hasBody && body.trim().length > 0;
  const missing = selected
    ? selected.parameters.filter((p) => p.in === 'path' && !values['path:' + p.name]).map((p) => p.name)
    : [];
  const snippetInput = {
    method: selected?.method ?? 'GET',
    url,
    headers: { ...(sendsBody ? { 'Content-Type': 'application/json' } : {}), ...headerMap },
    body: sendsBody ? body : null,
  };

  const run = async () => {
    if (!selected) return;
    if (sendsBody) {
      try {
        JSON.parse(body);
      } catch (e) {
        setBodyError(t('explorer.invalidJson', { message: (e as Error).message }));
        return;
      }
    }
    setBodyError('');
    setRunning(true);
    setRunError(null);
    abort.current = new AbortController();
    try {
      const r = await api.raw(selected.method, path, sendsBody ? body : null, headerMap, abort.current.signal);
      setResult(r);
      setTab('body');
      setHistory(
        [
          { key: selected.key, method: selected.method, url: path, status: r.status, at: new Date().toISOString() },
          ...history,
        ].slice(0, 12),
      );
    } catch (e) {
      setRunError(e);
    } finally {
      setRunning(false);
      abort.current = null;
    }
  };

  if (specError) {
    return (
      <div className="page">
        <PageHeader title={t('explorer.title')} subtitle={t('explorer.subtitle')} />
        <ErrorBanner error={specError} title={t('explorer.noSpec')} />
      </div>
    );
  }
  if (!ops) return <Loading />;

  return (
    <div className="page" style={{ maxWidth: 'none' }}>
      <PageHeader title={t('explorer.title')} subtitle={t('explorer.subtitle')} />
      <div className="explorer">
        <div className="panel form-stack explorer-picker">
          <label htmlFor="explorer-op" className="field-label">
            {t('explorer.operation')}
          </label>
          <select
            id="explorer-op"
            className="select explorer-select"
            value={selected ? selectedKey : ''}
            onChange={(e) => setSelectedKey(e.target.value)}
            title={selected ? selected.method + ' ' + selected.path : t('explorer.operationPlaceholder')}
          >
            <option value="" disabled>
              {t('explorer.operationPlaceholder')}
            </option>
            {grouped.map(([tag, list]) => (
              <optgroup key={tag} label={tag}>
                {list.map((op) => (
                  <option key={op.key} value={op.key}>
                    {op.method.toUpperCase() + '  ' + op.path + (op.summary ? '  \u00b7  ' + op.summary : '')}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {history.length > 0 ? (
            <div className="explorer-recent">
              <span className="field-label">{t('explorer.history')}</span>
              <div className="explorer-recent-list">
                {history.map((h, i) => (
                  <button
                    key={i}
                    type="button"
                    className="explorer-chip"
                    onClick={() => setSelectedKey(h.key)}
                    title={
                      h.method + ' ' + h.url + ' \u00b7 ' + h.status + ' \u00b7 ' + formatRelativeTime(locale, h.at)
                    }
                  >
                    <MethodBadge method={h.method} />
                    <span className="path">{h.url}</span>
                    <span className="small muted">{h.status}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="small muted">{t('explorer.historyEmpty')}</p>
          )}
        </div>
        <div className="form-stack" style={{ minWidth: 0 }}>
          {!selected ? null : (
            <>
              <div className="panel form-stack">
                <div className="row">
                  <MethodBadge method={selected.method} />
                  <strong className="mono" style={{ overflowWrap: 'anywhere' }}>
                    {selected.path}
                  </strong>
                </div>
                {selected.summary ? <p className="small muted">{selected.summary}</p> : null}
                {(['path', 'query'] as const).map((where) => {
                  const list = selected.parameters.filter((p) => p.in === where);
                  if (!list.length) return null;
                  return (
                    <div key={where} className="form-stack">
                      <span className="field-label">
                        {where === 'path' ? t('explorer.pathParams') : t('explorer.queryParams')}
                      </span>
                      <div className="form-grid">
                        {list.map((p) => (
                          <div className="field" key={p.name}>
                            <label htmlFor={'p-' + where + p.name}>
                              {p.name}{' '}
                              {p.required ? <span className="pill pill-warning">{t('common.required')}</span> : null}
                            </label>
                            <input
                              id={'p-' + where + p.name}
                              className="input mono"
                              placeholder={p.type}
                              value={values[where + ':' + p.name] ?? ''}
                              onChange={(e) => setValues({ ...values, [where + ':' + p.name]: e.target.value })}
                            />
                            {p.description ? <span className="field-hint">{p.description}</span> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div className="form-stack">
                  <span className="field-label">{t('explorer.headers')}</span>
                  {headers.map((h, i) => (
                    <div className="row" key={i}>
                      <input
                        className="input mono"
                        style={{ flex: 1, minWidth: 120 }}
                        placeholder={t('explorer.headerName')}
                        aria-label={t('explorer.headerName')}
                        value={h.name}
                        onChange={(e) =>
                          setHeaders(headers.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                        }
                      />
                      <input
                        className="input mono"
                        style={{ flex: 2, minWidth: 160 }}
                        placeholder={t('explorer.headerValue')}
                        aria-label={t('explorer.headerValue')}
                        value={h.value}
                        onChange={(e) =>
                          setHeaders(headers.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))
                        }
                      />
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setHeaders(headers.filter((_, j) => j !== i))}
                        aria-label={t('common.delete')}
                        title={t('common.delete')}
                      >
                        <Icon name="trash" />
                      </button>
                    </div>
                  ))}
                  <div>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => setHeaders([...headers, { name: '', value: '' }])}
                    >
                      <Icon name="plus" size={14} />
                      {t('explorer.addHeader')}
                    </button>
                  </div>
                </div>
                {selected.hasBody ? (
                  <div className="field">
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <label htmlFor="explorer-body" className="field-label">
                        {t('explorer.body')}
                      </label>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => {
                          try {
                            setBody(JSON.stringify(JSON.parse(body), null, 2));
                            setBodyError('');
                          } catch (e) {
                            setBodyError(t('explorer.invalidJson', { message: (e as Error).message }));
                          }
                        }}
                      >
                        {t('explorer.formatBody')}
                      </button>
                    </div>
                    <textarea
                      id="explorer-body"
                      className="textarea"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      aria-invalid={!!bodyError}
                      spellCheck={false}
                    />
                    {bodyError ? <span className="field-error">{bodyError}</span> : null}
                  </div>
                ) : null}
                <div className="field">
                  <span className="field-label">{t('explorer.resolvedUrl')}</span>
                  <span className="copyable">
                    <code className="value">{url}</code>
                    <CopyButton value={url} label={t('explorer.resolvedUrl')} />
                  </span>
                </div>
                {missing.length ? (
                  <span className="field-error">{t('explorer.missingPath', { names: missing.join(', ') })}</span>
                ) : null}
                <div className="form-actions">
                  {running ? (
                    <button type="button" className="btn" onClick={() => abort.current?.abort()}>
                      <Icon name="stop" size={14} />
                      {t('explorer.stop')}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={running || missing.length > 0}
                    onClick={() => (selected.destructive ? setConfirm(true) : void run())}
                  >
                    <Icon name="play" size={14} />
                    {running ? t('explorer.executing') : t('explorer.execute')}
                  </button>
                </div>
              </div>
              <div className="panel form-stack">
                <h2 className="section-title">{t('explorer.response')}</h2>
                {runError ? <ErrorBanner error={runError} /> : null}
                {!result && !runError ? <p className="small muted">{t('explorer.responseEmpty')}</p> : null}
                {result ? (
                  <>
                    <div className="row">
                      <span className={'pill ' + (result.status < 400 ? 'pill-success' : 'pill-danger')}>
                        {result.status}
                      </span>
                      <span className="small muted">
                        {t('explorer.statusLine', {
                          status: result.status,
                          text: result.statusText,
                          duration: formatDuration(locale, result.durationMs),
                          size: formatBytes(locale, result.bytes),
                        })}
                      </span>
                    </div>
                    <div className="tabs" role="tablist">
                      {(['body', 'headers', 'code'] as const).map((id) => (
                        <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
                          {t(
                            id === 'body'
                              ? 'explorer.tabBody'
                              : id === 'headers'
                                ? 'explorer.tabHeaders'
                                : 'explorer.tabCode',
                          )}
                        </button>
                      ))}
                    </div>
                    {tab === 'body' ? <CodeBlock text={result.bodyText} pretty label={t('explorer.tabBody')} /> : null}
                    {tab === 'headers' ? (
                      <CodeBlock text={JSON.stringify(result.headers, null, 2)} label={t('explorer.tabHeaders')} />
                    ) : null}
                  </>
                ) : null}
                {tab === 'code' || !result ? (
                  <div className="form-stack">
                    <span className="field-label">curl</span>
                    <CodeBlock text={curlSnippet(snippetInput)} label="curl" />
                    <span className="field-label">fetch</span>
                    <CodeBlock text={fetchSnippet(snippetInput)} label="fetch" />
                    <span className="field-label">C#</span>
                    <CodeBlock text={csharpSnippet(snippetInput)} label="C#" />
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
      {confirm && selected ? (
        <ConfirmModal
          title={t('explorer.confirmTitle', { method: selected.method, path })}
          body={t('explorer.confirmBody')}
          confirmLabel={t('explorer.execute')}
          danger
          onClose={() => setConfirm(false)}
          onConfirm={() => {
            void run();
          }}
        />
      ) : null}
    </div>
  );
}
