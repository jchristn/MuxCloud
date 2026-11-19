import type { AppStateStatus } from 'react-native';

/** What the biometric lock does when the app state changes. */
export interface LockTransition {
  /** Lock the app now. */
  lock: boolean;
  /** Ask for Face ID, Touch ID, or the passcode now. */
  prompt: boolean;
  /** Whether the app has been in the background since it last unlocked. */
  wentBackground: boolean;
}

/**
 * Decide what the lock does for an app state change. The Face ID sheet itself moves the app to `inactive` and back to
 * `active`, so only a real trip to the `background` locks the app and only the return from it prompts again. Without
 * this, every successful unlock re-triggered the prompt.
 */
export function lockTransition(next: AppStateStatus, locked: boolean, wentBackground: boolean): LockTransition {
  if (next === 'background') return { lock: true, prompt: false, wentBackground: true };
  if (next === 'active' && wentBackground) return { lock: false, prompt: locked, wentBackground: false };
  return { lock: false, prompt: false, wentBackground };
}
