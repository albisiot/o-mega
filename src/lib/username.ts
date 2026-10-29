// Mirrors the `profiles_username_format` check and set_username() in the database.
export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value.trim());
}
