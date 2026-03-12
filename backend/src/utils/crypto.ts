import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12; // GCM recommended 12 bytes

function getKey(): Buffer {
  const secret = process.env.OPENAI_ENCRYPTION_KEY || process.env.DATA_KEY;
  if (!secret) {
    throw new Error("Missing encryption key (OPENAI_ENCRYPTION_KEY or DATA_KEY)");
  }
  // Derive 32-byte key from secret via SHA-256
  return crypto.createHash("sha256").update(String(secret)).digest();
}

export function encryptString(plain: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, enc]).toString("base64");
  return `ENC::${payload}`;
}

export function decryptString(payload: string): string {
  const b64 = payload.startsWith("ENC::") ? payload.slice(5) : payload;
  const buf = Buffer.from(b64, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + 16);
  const enc = buf.subarray(IV_LENGTH + 16);
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}
