// What the server last said, kept for this visit: a screen can show it at once
// and replace it when the fresh answer arrives. For display only: every action
// is still checked by the server.
const values = new Map<string, unknown>();

export function lastSeen<T>(key: string): T | null {
  return (values.get(key) as T | undefined) ?? null;
}

export function keepSeen<T>(key: string, value: T): T {
  values.set(key, value);
  return value;
}

export function forget(key: string): void {
  values.delete(key);
}

/** The next player on this device must not see the previous one's data. */
export function forgetEverything(): void {
  values.clear();
}
