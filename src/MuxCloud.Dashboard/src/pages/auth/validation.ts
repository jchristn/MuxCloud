/** Inline validation for the auth forms. Returns translation keys, or null when valid. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailError(value: string): string | null {
  const v = value.trim();
  if (!v) return 'auth.emailRequired';
  return EMAIL.test(v) ? null : 'auth.emailInvalid';
}

export function passwordError(value: string, minLength = 0): string | null {
  if (!value) return 'auth.passwordRequired';
  return minLength && value.length < minLength ? 'auth.passwordTooShort' : null;
}

export function confirmError(password: string, confirm: string): string | null {
  return confirm !== password ? 'auth.passwordMismatch' : null;
}

/** Focus the first invalid field after a failed submit. */
export function focusFirstInvalid(form: HTMLFormElement | null): void {
  form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
}
