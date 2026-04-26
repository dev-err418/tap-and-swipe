export function maskEmail(email: string | null | undefined): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const head = local.length > 1 ? local[0] : "*";
  return `${head}${"*".repeat(Math.max(2, local.length - 1))}@${domain}`;
}

export function maskName(name: string | null | undefined): string {
  if (!name) return "";
  if (name.length <= 1) return "*";
  return `${name[0]}${"*".repeat(Math.max(2, name.length - 1))}`;
}

export function maskDiscordId(id: string | null | undefined): string {
  if (!id) return "";
  return `${id.slice(0, 4)}…${id.slice(-2)}`;
}
