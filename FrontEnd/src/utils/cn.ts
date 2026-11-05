/**
 * Utility function to join CSS class names cleanly without third-party dependencies.
 */
export function cn(
  ...classes: (string | number | boolean | null | undefined)[]
): string {
  return classes.filter(Boolean).join(' ')
}

export default cn
