/**
 * A small syntax highlighter for code blocks in replies (exported for tests). It splits code into keyword, string,
 * number, comment, and plain spans for the common languages mux works with. It is a tokenizer, not a parser: good enough
 * to make code readable on a phone, without a large dependency.
 */

export type SpanKind = 'plain' | 'keyword' | 'string' | 'number' | 'comment' | 'type';

export interface Span {
  kind: SpanKind;
  text: string;
}

const C_LIKE = 'if else for while do switch case break continue return new delete class struct interface enum public private protected internal static readonly const let var function async await try catch finally throw import export from default extends implements this super null undefined true false void typeof instanceof in of using namespace yield get set override virtual abstract sealed partial lock foreach is as out ref base where select';
const PYTHON = 'def class if elif else for while return import from as with try except finally raise pass break continue lambda yield global nonlocal assert del in is not and or None True False async await self';
const SHELL = 'if then else elif fi for in do done while until case esac function return export local echo exit set unset cd source';
const GO = 'func package import var const type struct interface map chan go defer select switch case default if else for range return break continue fallthrough nil true false';
const RUST = 'fn let mut pub impl trait struct enum match if else for while loop return use mod crate self super as where const static ref move async await dyn true false None Some Ok Err';
const SQL = 'select from where insert into values update set delete create table alter drop index join left right inner outer on group by order having limit offset and or not null as distinct union all primary key foreign references default';

const KEYWORDS: Record<string, Set<string>> = {};
const register = (names: string[], words: string, caseInsensitive = false) => {
  const set = new Set(words.split(' ').map((w) => (caseInsensitive ? w.toLowerCase() : w)));
  for (const n of names) KEYWORDS[n] = set;
};
register(['js', 'javascript', 'jsx', 'ts', 'typescript', 'tsx', 'java', 'c', 'cpp', 'c++', 'cs', 'csharp', 'c#', 'kotlin', 'swift', 'dart', 'php', 'scala'], C_LIKE);
register(['py', 'python'], PYTHON);
register(['sh', 'bash', 'zsh', 'shell', 'console', 'ps1', 'powershell'], SHELL);
register(['go', 'golang'], GO);
register(['rs', 'rust'], RUST);
register(['sql'], SQL, true);

const HASH_COMMENTS = new Set(['py', 'python', 'sh', 'bash', 'zsh', 'shell', 'console', 'ps1', 'powershell', 'yaml', 'yml', 'toml', 'ruby', 'rb', 'r', 'dockerfile', 'makefile']);
const DASH_COMMENTS = new Set(['sql', 'lua', 'haskell']);

/** Highlight `code` written in `lang` (a fence info string such as `ts` or `python`). Unknown languages get strings and numbers. */
export function highlight(code: string, lang?: string | null): Span[] {
  const language = (lang ?? '').trim().split(/\s+/)[0].toLowerCase();
  const keywords = KEYWORDS[language];
  const caseInsensitive = language === 'sql';
  const hashComments = HASH_COMMENTS.has(language);
  const slashComments = !hashComments && !DASH_COMMENTS.has(language) && language !== 'json';
  const dashComments = DASH_COMMENTS.has(language);
  const spans: Span[] = [];
  const push = (kind: SpanKind, text: string) => {
    if (!text) return;
    const last = spans[spans.length - 1];
    if (last && last.kind === kind) last.text += text;
    else spans.push({ kind, text });
  };
  let i = 0;
  const n = code.length;
  while (i < n) {
    const c = code[i];
    const next = code[i + 1];
    if ((slashComments && c === '/' && next === '/') || (hashComments && c === '#') || (dashComments && c === '-' && next === '-')) {
      const end = code.indexOf('\n', i);
      const stop = end < 0 ? n : end;
      push('comment', code.slice(i, stop));
      i = stop;
      continue;
    }
    if (slashComments && c === '/' && next === '*') {
      const end = code.indexOf('*/', i + 2);
      const stop = end < 0 ? n : end + 2;
      push('comment', code.slice(i, stop));
      i = stop;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < n && code[j] !== c) {
        if (code[j] === '\\') j++;
        if (code[j] === '\n' && c !== '`') break;
        j++;
      }
      const stop = Math.min(n, j + 1);
      push('string', code.slice(i, stop));
      i = stop;
      continue;
    }
    if (/[0-9]/.test(c) && !/[A-Za-z_$]/.test(code[i - 1] ?? '')) {
      const m = /^(0x[0-9a-fA-F_]+|[0-9][0-9_]*(\.[0-9_]+)?([eE][+-]?[0-9]+)?[a-zA-Z]*)/.exec(code.slice(i));
      const text = m ? m[0] : c;
      push('number', text);
      i += text.length;
      continue;
    }
    if (/[A-Za-z_$@]/.test(c)) {
      const m = /^[A-Za-z_$@][A-Za-z0-9_$]*/.exec(code.slice(i));
      const word = m ? m[0] : c;
      const key = caseInsensitive ? word.toLowerCase() : word;
      if (keywords?.has(key)) push('keyword', word);
      else if (keywords && /^[A-Z][a-z0-9]+[A-Za-z0-9]*$/.test(word) && language !== 'sql') push('type', word);
      else push('plain', word);
      i += word.length;
      continue;
    }
    push('plain', c);
    i++;
  }
  return spans;
}
