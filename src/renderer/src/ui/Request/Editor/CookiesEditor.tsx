import { useEffect, useMemo, useState, type JSX } from 'react';
import type { KeyValue, Variable } from '#/shared/types';
import { KeyValueEditor } from '#/renderer/src/components/KeyValueEditor';
import { emptyKeyValue } from '#/renderer/src/store/drafts';
import { buildRuntimeVars, substituteWithMap } from '#/renderer/src/scripting/scriptOrchestration';
import { hostFromUrl } from './cookieHost';

interface Props {
  /**
   * Request URL used to resolve the cookie domain.
   */
  url: string;

  /**
   * Collection-scoped variables for URL substitution.
   */
  variables: Variable[];
}

/**
 * Editable cookie list for the request URL host, backed by the main-process jar.
 */
export function CookiesEditor({ url, variables }: Props): JSX.Element {
  const host = useMemo(() => {
    const resolvedUrl = substituteWithMap(url, buildRuntimeVars(variables));
    return hostFromUrl(resolvedUrl);
  }, [url, variables]);

  const [rows, setRows] = useState<KeyValue[]>([emptyKeyValue()]);
  const [loadedHost, setLoadedHost] = useState<string | null>(null);
  const loading = host !== null && loadedHost !== host;

  useEffect(() => {
    if (!host) return;

    let cancelled = false;

    void window.api
      .getCookies(host)
      .then((cookies) => {
        if (cancelled) return;
        setRows(cookies.length ? cookies : [emptyKeyValue()]);
      })
      .catch(() => {
        if (cancelled) return;
        setRows([emptyKeyValue()]);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadedHost(host);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [host]);

  /**
   * Updates local state and persists cookies for the current host.
   *
   * @param nextRows - Updated cookie rows.
   */
  const handleChange = (nextRows: KeyValue[]): void => {
    setRows(nextRows);
    if (!host) return;
    void window.api.setCookies(host, nextRows);
  };

  if (!host) {
    return <p className="text-[13px] text-muted">Enter a valid URL to manage cookies.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-[12px] text-muted">
        Cookies for <span className="font-medium text-text">{host}</span>
      </p>
      {loading ? (
        <p className="text-[13px] text-muted">Loading cookies…</p>
      ) : (
        <KeyValueEditor
          rows={rows}
          onChange={handleChange}
          placeholderKey="name"
          placeholderValue="value"
          variables={variables}
        />
      )}
    </div>
  );
}
