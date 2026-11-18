import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router';

/** Inline markdown: **bold**, *italic*, `code`, and [links](url). */
function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`|\*[^*]+\*)/g;
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index! > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith('**')) parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith('`')) parts.push(<code key={key++}>{token.slice(1, -1)}</code>);
    else if (token.startsWith('[')) {
      const m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)!;
      const href = m[2];
      parts.push(
        href.startsWith('/') ? (
          <Link key={key++} to={href}>
            {m[1]}
          </Link>
        ) : (
          <a key={key++} href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">
            {m[1]}
          </a>
        ),
      );
    } else parts.push(<em key={key++}>{token.slice(1, -1)}</em>);
    last = match.index! + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** A small, safe markdown renderer for the bundled legal documents: headings, paragraphs, and lists. */
export function Markdown({ source }: { source: string }) {
  const blocks: ReactNode[] = [];
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const content = inline(heading[2]);
      blocks.push(
        level === 1 ? (
          <h1 key={key++}>{content}</h1>
        ) : level === 2 ? (
          <h2 key={key++}>{content}</h2>
        ) : (
          <h3 key={key++}>{content}</h3>
        ),
      );
      i++;
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ''));
        i++;
      }
      const children = items.map((item, n) => <li key={n}>{inline(item)}</li>);
      blocks.push(ordered ? <ol key={key++}>{children}</ol> : <ul key={key++}>{children}</ul>);
      continue;
    }
    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3})\s/.test(lines[i]) &&
      !/^\s*([-*]|\d+\.)\s+/.test(lines[i])
    ) {
      paragraph.push(lines[i].trim());
      i++;
    }
    blocks.push(<p key={key++}>{inline(paragraph.join(' '))}</p>);
  }
  return (
    <div className="markdown">
      {blocks.map((b, n) => (
        <Fragment key={n}>{b}</Fragment>
      ))}
    </div>
  );
}
