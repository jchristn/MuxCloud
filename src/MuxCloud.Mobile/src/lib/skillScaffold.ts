/**
 * A port of mux's SkillScaffoldWriter (src/Mux.Core/Skills/SkillScaffoldWriter.cs): builds a starter SKILL.md with one
 * runnable inline block, so a new skill works before its author edits anything. Keep the text identical to the desktop
 * so skills created on either surface look the same.
 */

export interface SkillScaffold {
  id: string;
  title: string;
  description: string;
  interpreter: string;
  mutating: boolean;
}

/** Interpreters offered as one-tap choices; any other value can be typed. */
export const SKILL_INTERPRETERS = ['bash', 'python', 'node', 'pwsh'] as const;

const SKILL_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** True for a valid skill id: lowercase letters and digits, separated by single hyphens (mux SkillManager.IsValidId). */
export function isValidSkillId(id: string): boolean {
  return SKILL_ID.test(id);
}

/** Suggests an id from a title: "Deploy to Prod!" becomes "deploy-to-prod". */
export function skillIdFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

function starterBlock(interpreter: string): string {
  switch (interpreter.toLowerCase()) {
    case 'pwsh':
      return "```pwsh id=run\nWrite-Output 'Hello from the new skill. Edit scripts or this block to do real work.'\n```\n";
    case 'python':
      return "```python id=run\nprint('Hello from the new skill. Edit this block to do real work.')\n```\n";
    case 'node':
      return "```js id=run\nconsole.log('Hello from the new skill. Edit this block to do real work.');\n```\n";
    default:
      return '```' + interpreter + " id=run\necho 'Hello from the new skill. Edit this block to do real work.'\n```\n";
  }
}

/** The complete SKILL.md text for a scaffold. */
export function buildSkillMarkdown(scaffold: SkillScaffold): string {
  const description = scaffold.description.trim() ? scaffold.description.trim() : 'Describe what this skill does.';
  const interpreter = scaffold.interpreter.trim() || 'bash';
  return (
    '---\n' +
    'name: ' +
    scaffold.id.trim() +
    '\n' +
    'title: ' +
    scaffold.title.trim() +
    '\n' +
    'description: ' +
    description +
    '\n' +
    'version: 0.1.0\n' +
    'mutating: ' +
    (scaffold.mutating ? 'true' : 'false') +
    '\n' +
    'whenToUse: Explain when the model should reach for this skill.\n' +
    'tags: []\n' +
    'commands:\n' +
    '  - name: run\n' +
    '    description: The starter command; edit it to do real work.\n' +
    '    block: run\n' +
    '    interpreter: ' +
    interpreter +
    '\n' +
    '---\n\n' +
    '## What this does\n\n' +
    description +
    '\n\n' +
    '## How to use\n\n' +
    "Call `skill` with this skill's name to read these instructions, then `run_skill` " +
    'with command `run`.\n\n' +
    starterBlock(interpreter)
  );
}
