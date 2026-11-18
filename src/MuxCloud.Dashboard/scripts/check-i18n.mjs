// i18n gate (I18N.md): every locale has exactly the English keys, keeps the same {{placeholders}} and <tags>, has no
// empty values; every statically referenced key exists; no English key is unused; no hard-coded JSX text.
// Runs on Node 22.6+ (TypeScript type stripping).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = new URL('..', import.meta.url).pathname;
const catalogDir = join(root, 'src/i18n/catalog');
const problems = [];

function flatten(tree, prefix = '', out = new Map()) {
  for (const [key, value] of Object.entries(tree)) {
    const full = prefix ? prefix + '.' + key : key;
    if (typeof value === 'string') out.set(full, value);
    else flatten(value, full, out);
  }
  return out;
}

const tokens = (value) =>
  [...value.matchAll(/\{\{\s*(\w+)\s*\}\}|<\/?(\w+)>/g)]
    .map((m) => m[1] ?? '<' + m[2] + '>')
    .sort()
    .join(',');

const en = flatten((await import(pathToFileURL(join(catalogDir, 'en.ts')).href)).en);
const localeFiles = readdirSync(join(catalogDir, 'locales')).filter(
  (f) => f.endsWith('.ts') && !f.endsWith('.test.ts'),
);
const expected = ['es', 'pt', 'fr', 'it', 'de', 'zh', 'ar', 'ru', 'ms', 'hi', 'ja'];
for (const code of expected)
  if (!localeFiles.includes(code + '.ts')) problems.push(`missing locale file locales/${code}.ts`);

for (const file of localeFiles) {
  const code = file.replace(/\.ts$/, '');
  const mod = await import(pathToFileURL(join(catalogDir, 'locales', file)).href);
  const catalog = mod[code.replace('-', '_')];
  if (!catalog) {
    problems.push(`${file}: no export named ${code}`);
    continue;
  }
  const values = flatten(catalog);
  for (const key of en.keys()) {
    if (!values.has(key)) problems.push(`${code}: missing ${key}`);
    else if (!values.get(key).trim()) problems.push(`${code}: empty ${key}`);
    else if (tokens(values.get(key)) !== tokens(en.get(key)))
      problems.push(`${code}: ${key} placeholders differ (${tokens(values.get(key))} vs ${tokens(en.get(key))})`);
  }
  for (const key of values.keys()) if (!en.has(key)) problems.push(`${code}: orphan ${key}`);
}

// Source scan.
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) && !full.includes('/i18n/catalog/'))
      out.push(full);
  }
  return out;
}
const files = walk(join(root, 'src'));
const sources = files.map((f) => [f, readFileSync(f, 'utf8')]);
const referenced = new Set();
// The catalog is shared with the mobile app, so a key the app uses is not an orphan.
const mobileSrc = join(root, '..', 'MuxCloud.Mobile', 'src');
const mobileSources = existsSync(mobileSrc)
  ? walk(mobileSrc)
      .filter((f) => !f.includes('node_modules'))
      .map((f) => readFileSync(f, 'utf8'))
  : [];
for (const text of mobileSources) {
  for (const m of text.matchAll(/['"`]([a-zA-Z]+(?:\.[a-zA-Z0-9.]+)+)['"`]/g)) if (en.has(m[1])) referenced.add(m[1]);
}
// Literal keys: t('a.b'), i18nKey="a.b", key: 'a.b' (nav, step, and range tables), and quoted 'a.b' strings that are keys.
for (const [, text] of sources) {
  for (const m of text.matchAll(/['"`]([a-zA-Z]+(?:\.[a-zA-Z0-9.]+)+)['"`]/g)) if (en.has(m[1])) referenced.add(m[1]);
}
// Keys built at runtime from a prefix: everything under these prefixes counts as referenced.
const dynamicPrefixes = ['errors.', 'features.', 'billing.status', 'explorer.tab'];
for (const key of en.keys()) if (dynamicPrefixes.some((p) => key.startsWith(p))) referenced.add(key);
for (const [file, text] of sources) {
  for (const m of text.matchAll(/\bt\(\s*['"]([a-zA-Z]+(?:\.[a-zA-Z0-9]+)+)['"]/g)) {
    if (!en.has(m[1])) problems.push(`${relative(root, file)}: unknown key ${m[1]}`);
  }
  for (const m of text.matchAll(/i18nKey=["']([^"']+)["']/g))
    if (!en.has(m[1])) problems.push(`${relative(root, file)}: unknown key ${m[1]}`);
}
for (const key of en.keys())
  if (!referenced.has(key)) problems.push(`orphan English key ${key} (not referenced in src)`);

// Hard-coded JSX text: a text node with two or more letters directly before a closing tag. Technical labels that
// are the same in every language (code languages) are allowed.
const TECHNICAL = new Set(['curl', 'fetch', 'C#']);
for (const [file, text] of sources) {
  if (!file.endsWith('.tsx')) continue;
  text.split('\n').forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
    for (const m of line.matchAll(/>([^<>{}]*[A-Za-z]{2,}[^<>{}]*)<\//g)) {
      const value = m[1].trim();
      if (!value || TECHNICAL.has(value)) continue;
      problems.push(`${relative(root, file)}:${i + 1}: hard-coded text "${value}"`);
    }
  });
}

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\n${problems.length} i18n problem(s).`);
  process.exit(1);
}
console.log(`i18n OK: ${en.size} keys, ${localeFiles.length} translated locales.`);
