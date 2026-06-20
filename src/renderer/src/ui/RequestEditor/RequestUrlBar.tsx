import type { HttpMethod, Variable } from '#/shared/types';
import { MethodSelect } from '#/renderer/src/components/MethodSelect';
import { VariableInput } from '#/renderer/src/components/VariableInput';
import { primaryButton } from '#/renderer/src/ui/shared/classes';
import type { JSX } from 'react';

interface Props {
  /**
   * HTTP method for the request.
   */
  method: HttpMethod;

  /**
   * Request URL.
   */
  url: string;

  /**
   * Collection-scoped variables for URL highlighting and tooltips.
   */
  variables: Variable[];

  /**
   * Disables Send while a request is in flight.
   */
  sending: boolean;

  /**
   * Called when the HTTP method changes.
   */
  onMethodChange: (method: HttpMethod) => void;

  /**
   * Called when the URL changes.
   */
  onUrlChange: (url: string) => void;

  /**
   * Called when the user clicks Send.
   */
  onSend: () => void;

  /**
   * Opens collection settings to edit variables.
   */
  onEditVariables?: () => void;
}

/**
 * Method selector, URL input, and Send button.
 */
export function RequestUrlBar({
  method,
  url,
  variables,
  sending,
  onMethodChange,
  onUrlChange,
  onSend,
  onEditVariables
}: Props): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center overflow-hidden rounded-md border border-separator bg-control shadow-[inset_0_0.5px_1px_rgba(0,0,0,0.06)]">
        <MethodSelect value={method} onChange={onMethodChange} />
        <div className="h-5 w-px shrink-0 bg-separator" />
        <VariableInput
          className="app-no-drag"
          value={url}
          onChange={onUrlChange}
          variables={variables}
          placeholder="Enter request URL"
          onEditVariable={onEditVariables}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSend();
          }}
        />
      </div>
      <button className={primaryButton} onClick={onSend} disabled={sending}>
        {sending ? 'Sending…' : 'Send'}
      </button>
    </div>
  );
}
