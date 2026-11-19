import { groupCommands, normalizeChord, overridesAfter } from '@/lib/keybindings';

describe('keybindings', () => {
  it('normalizes chords', () => {
    expect(normalizeChord(' Ctrl + K ')).toBe('ctrl+k');
    expect(normalizeChord('')).toBe('');
  });

  it('keeps stored overrides and changes one', () => {
    const current = [
      { CommandId: 'a', Chord: 'ctrl+a' },
      { CommandId: 'b', Chord: null },
    ];
    expect(overridesAfter(current, 'c', 'Alt+C', 'ctrl+c')).toEqual([
      { CommandId: 'a', Chord: 'ctrl+a' },
      { CommandId: 'b', Chord: '' },
      { CommandId: 'c', Chord: 'alt+c' },
    ]);
  });

  it('unbinds with a blank chord and resets with the default', () => {
    const current = [{ CommandId: 'a', Chord: 'ctrl+x' }];
    expect(overridesAfter(current, 'a', '', 'ctrl+a')).toEqual([{ CommandId: 'a', Chord: '' }]);
    expect(overridesAfter(current, 'a', 'CTRL+A', 'ctrl+a')).toEqual([]);
  });

  it('groups by category and filters', () => {
    const items = [
      { CommandId: 'mux.save', Title: 'Save session', Category: 'Session', DefaultChord: 'ctrl+s', EffectiveChord: 'ctrl+s', Overridden: false },
      { CommandId: 'mux.new', Title: 'New chat', Category: 'Session', DefaultChord: 'ctrl+n', EffectiveChord: null, Overridden: true },
      { CommandId: 'mux.find', Title: 'Find', Category: 'Edit', DefaultChord: 'ctrl+f', EffectiveChord: 'ctrl+f', Overridden: false },
    ];
    expect(groupCommands(items, '').map((g) => [g.category, g.items.length])).toEqual([
      ['Session', 2],
      ['Edit', 1],
    ]);
    expect(groupCommands(items, 'ctrl+f').map((g) => g.category)).toEqual(['Edit']);
  });
});
