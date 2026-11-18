import { CopyButton } from './CopyButton';

/** Preformatted text with a copy button. JSON is pretty-printed when it parses. */
export function CodeBlock({ text, label, pretty = false }: { text: string; label?: string; pretty?: boolean }) {
  let shown = text;
  if (pretty) {
    try {
      shown = JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      shown = text;
    }
  }
  return (
    <div className="code-wrap">
      <pre className="code-block">{shown}</pre>
      <CopyButton value={shown} label={label} />
    </div>
  );
}
