/** True when an error means a lazily loaded chunk from an older build could not be fetched. */
export function isStaleBuildError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Failed to load module script/i.test(
    message,
  );
}
