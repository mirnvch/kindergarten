import { generateSecret as otpGenerateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

/**
 * Get encryption key at runtime (not module load time)
 */
function getEncryptionKey(): string {
  const key = process.env.TOTP_ENCRYPTION_KEY || process.env.AUTH_SECRET;
  if (!key) {
    throw new Error("TOTP_ENCRYPTION_KEY or AUTH_SECRET must be set");
  }
  return key;
}

/**
 * Encrypt TOTP secret for database storage
 */
export function encryptSecret(secret: string): string {
  const key = crypto.scryptSync(getEncryptionKey(), "salt", 32);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(secret, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt TOTP secret from database
 */
export function decryptSecret(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(":");

  const key = crypto.scryptSync(getEncryptionKey(), "salt", 32);
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Generate a new TOTP secret
 */
export function generateSecret(): string {
  return otpGenerateSecret();
}

/**
 * Generate TOTP URI for authenticator apps
 */
export function generateTotpUri(secret: string, email: string): string {
  return generateURI({
    strategy: "totp",
    issuer: "KinderCare",
    label: email,
    secret,
  });
}

/**
 * Generate QR code as data URL
 */
export async function generateQRCode(otpUri: string): Promise<string> {
  return QRCode.toDataURL(otpUri, {
    width: 256,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

/**
 * Verify a TOTP token
 */
export async function verifyToken(secret: string, token: string): Promise<boolean> {
  try {
    const result = await verify({
      secret,
      token,
    });
    return result.valid;
  } catch {
    return false;
  }
}

/**
 * Generate backup codes
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    // Format as XXXX-XXXX for readability
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
  }

  return codes;
}

/**
 * Hash a backup code for storage
 */
export async function hashBackupCode(code: string): Promise<string> {
  // Normalize the code (remove dashes, uppercase)
  const normalized = code.replace(/-/g, "").toUpperCase();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Verify a backup code against stored hash
 */
export async function verifyBackupCode(
  code: string,
  hash: string
): Promise<boolean> {
  const codeHash = await hashBackupCode(code);
  return crypto.timingSafeEqual(
    Buffer.from(codeHash, "hex"),
    Buffer.from(hash, "hex")
  );
}
