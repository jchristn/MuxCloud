/** Pseudo-locales generated from the English source: expansion (accented, about 35% longer) and RTL. */
type Tree = { [key: string]: string | Tree };

const ACCENTS: Record<string, string> = {
  a: 'ȧ', b: 'ƀ', c: 'ƈ', d: 'ḓ', e: 'ḗ', f: 'ƒ', g: 'ɠ', h: 'ħ', i: 'ī', j: 'ĵ', k: 'ķ', l: 'ŀ', m: 'ḿ',
  n: 'ƞ', o: 'ǿ', p: 'ƥ', q: 'ɋ', r: 'ř', s: 'ş', t: 'ŧ', u: 'ŭ', v: 'ṽ', w: 'ẇ', x: 'ẋ', y: 'ẏ', z: 'ẑ',
  A: 'Ȧ', B: 'Ɓ', C: 'Ƈ', D: 'Ḓ', E: 'Ḗ', F: 'Ƒ', G: 'Ɠ', H: 'Ħ', I: 'Ī', J: 'Ĵ', K: 'Ķ', L: 'Ŀ', M: 'Ḿ',
  N: 'Ƞ', O: 'Ǿ', P: 'Ƥ', Q: 'Ɋ', R: 'Ř', S: 'Ş', T: 'Ŧ', U: 'Ŭ', V: 'Ṽ', W: 'Ẇ', X: 'Ẋ', Y: 'Ẏ', Z: 'Ẑ',
};

/** Transform text outside {{interpolations}} and <tags>. */
function mapText(value: string, fn: (text: string) => string): string {
  return value
    .split(/(\{\{[^}]+\}\}|<[^>]+>)/g)
    .map((part) => (part.startsWith('{{') || part.startsWith('<') ? part : fn(part)))
    .join('');
}

export function expand(value: string): string {
  const accented = mapText(value, (t) => t.replace(/[A-Za-z]/g, (c) => ACCENTS[c] ?? c));
  const pad = '~'.repeat(Math.max(1, Math.round(value.length * 0.35)));
  return '[' + accented + ' ' + pad + ']';
}

export function rtl(value: string): string {
  return '‮' + value + '‬';
}

export function pseudoTree(tree: Tree, fn: (value: string) => string): Tree {
  const out: Tree = {};
  for (const [key, value] of Object.entries(tree)) out[key] = typeof value === 'string' ? fn(value) : pseudoTree(value, fn);
  return out;
}
