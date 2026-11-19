import { buildSkillMarkdown, isValidSkillId, skillIdFromTitle } from '@/lib/skillScaffold';

describe('skill scaffold', () => {
  it('validates ids like mux SkillManager.IsValidId', () => {
    expect(isValidSkillId('my-skill')).toBe(true);
    expect(isValidSkillId('a1-b2-c3')).toBe(true);
    expect(isValidSkillId('My-Skill')).toBe(false);
    expect(isValidSkillId('my--skill')).toBe(false);
    expect(isValidSkillId('-skill')).toBe(false);
    expect(isValidSkillId('skill-')).toBe(false);
    expect(isValidSkillId('my_skill')).toBe(false);
    expect(isValidSkillId('')).toBe(false);
  });

  it('suggests an id from a title', () => {
    expect(skillIdFromTitle('Deploy to Prod!')).toBe('deploy-to-prod');
    expect(skillIdFromTitle('  --Hello   World--  ')).toBe('hello-world');
    expect(isValidSkillId(skillIdFromTitle('x'.repeat(59) + ' y'))).toBe(true);
    expect(skillIdFromTitle('日本語')).toBe('');
  });

  it('builds the same SKILL.md as the desktop writer', () => {
    const md = buildSkillMarkdown({ id: 'greet', title: 'Greet', description: 'Says hello.', interpreter: 'python', mutating: true });
    expect(md).toBe(
      '---\nname: greet\ntitle: Greet\ndescription: Says hello.\nversion: 0.1.0\nmutating: true\n' +
        'whenToUse: Explain when the model should reach for this skill.\ntags: []\ncommands:\n  - name: run\n' +
        '    description: The starter command; edit it to do real work.\n    block: run\n    interpreter: python\n---\n\n' +
        '## What this does\n\nSays hello.\n\n## How to use\n\n' +
        "Call `skill` with this skill's name to read these instructions, then `run_skill` with command `run`.\n\n" +
        "```python id=run\nprint('Hello from the new skill. Edit this block to do real work.')\n```\n",
    );
  });

  it('fills a blank description and picks the starter block per interpreter', () => {
    expect(buildSkillMarkdown({ id: 'a', title: '', description: ' ', interpreter: 'bash', mutating: false })).toContain('description: Describe what this skill does.\n');
    expect(buildSkillMarkdown({ id: 'a', title: '', description: '', interpreter: 'node', mutating: false })).toContain('```js id=run\nconsole.log(');
    expect(buildSkillMarkdown({ id: 'a', title: '', description: '', interpreter: 'pwsh', mutating: false })).toContain('```pwsh id=run\nWrite-Output');
    expect(buildSkillMarkdown({ id: 'a', title: '', description: '', interpreter: 'zsh', mutating: false })).toContain('```zsh id=run\necho ');
    expect(buildSkillMarkdown({ id: 'a', title: '', description: '', interpreter: '', mutating: false })).toContain('interpreter: bash\n');
  });
});
