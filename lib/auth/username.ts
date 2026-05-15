export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string): boolean {
  const normalized = normalizeUsername(value);
  return /^[a-z0-9_]{3,32}$/.test(normalized);
}

export function usernameFromName(name: string): string {
  return normalizeUsername(name.replace(/\s+/g, ""));
}
