import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // 32 bytes hex
const ALGORITHM = "aes-256-cbc";

export function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error("ENCRYPTION_KEY is not set");
  }

  const key = Buffer.from(ENCRYPTION_KEY, "hex");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes (64 hex characters)");
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

export function decrypt(encryptedText: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error("ENCRYPTION_KEY is not set");
  }

  const key = Buffer.from(ENCRYPTION_KEY, "hex");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes (64 hex characters)");
  }

  const parts = encryptedText.split(":");
  if (parts.length !== 2) {
    throw new Error("Invalid encrypted text format");
  }

  const iv = Buffer.from(parts[0]!, "hex");
  const encrypted = parts[1]!;
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}


