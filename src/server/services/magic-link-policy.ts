export function canConsumeMagicLink(
  token: { usedAt: Date | null; expiresAt: Date },
  now = new Date(),
) {
  return token.usedAt === null && token.expiresAt.getTime() > now.getTime();
}
