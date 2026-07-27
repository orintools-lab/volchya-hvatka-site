import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { getAbsoluteSiteUrl } from "../../lib/config/site-url";

const TOKEN_BYTES = 32;

function encryptionKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET не настроен для безопасных ссылок на оплату.");
  }
  return createHash("sha256").update(secret).digest();
}

export function hashPaymentToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createPaymentToken() {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  return {
    token,
    hash: hashPaymentToken(token),
    encrypted: encryptPaymentToken(token),
  };
}

export function encryptPaymentToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((part) => part.toString("base64url"))
    .join(".");
}

export function decryptPaymentToken(value: string) {
  const [iv, tag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  if (!iv || !tag || !encrypted) throw new Error("Некорректный зашифрованный токен.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function publicPaymentUrl(token: string) {
  return getAbsoluteSiteUrl(`/pay/${encodeURIComponent(token)}`);
}

export function paymentLinkExpiry(hours: number, now = new Date()) {
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}

export function isPaymentLinkExpired(expiresAt: Date | null, now = new Date()) {
  return !expiresAt || expiresAt.getTime() <= now.getTime();
}
