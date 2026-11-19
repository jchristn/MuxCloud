import { lockTransition } from '@/lib/lockPolicy';

describe('biometric lock transitions', () => {
  it('does not prompt again when the Face ID sheet returns the app to active', () => {
    // Unlocked, the sheet made the app inactive and then active again: no new prompt.
    expect(lockTransition('inactive', false, false)).toEqual({
      lock: false,
      prompt: false,
      wentBackground: false,
    });
    expect(lockTransition('active', false, false)).toEqual({
      lock: false,
      prompt: false,
      wentBackground: false,
    });
  });

  it('does not prompt on the active event that follows a cancelled prompt', () => {
    expect(lockTransition('active', true, false).prompt).toBe(false);
  });

  it('locks in the background and prompts once on return', () => {
    const away = lockTransition('background', false, false);
    expect(away).toEqual({ lock: true, prompt: false, wentBackground: true });
    const back = lockTransition('active', true, away.wentBackground);
    expect(back).toEqual({ lock: false, prompt: true, wentBackground: false });
    // The sheet that prompt opens produces another inactive/active pair, which must not prompt again.
    expect(lockTransition('inactive', true, back.wentBackground).prompt).toBe(false);
    expect(lockTransition('active', false, back.wentBackground).prompt).toBe(false);
  });
});
