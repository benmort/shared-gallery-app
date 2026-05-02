export function roleHashToken(role: string): string {
  return role
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function roleHash(role: string): string {
  return `#${roleHashToken(role)}`;
}

export function roleFromHash(hash: string, roles: readonly string[]): string | null {
  const normalizedHash = hash.replace(/^#/, "").trim().toLowerCase();
  if (!normalizedHash) return null;
  return roles.find((role) => roleHashToken(role) === normalizedHash) ?? null;
}
