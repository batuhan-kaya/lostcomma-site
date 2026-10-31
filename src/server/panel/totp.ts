/**
 * Two-step sign in (RFC 6238 TOTP · SHA-1 · 30 s · 6 digits) · works with every authenticator app.
 * A code is accepted once: the step it was valid for is remembered and older steps are refused.
 */
import { createHmac, randomBytes } from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function fromBase32(s: string): Buffer {
  const clean = s.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const c of clean) {
    const i = ALPHABET.indexOf(c);
    if (i < 0) throw new Error('not base32');
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export const STEP_MS = 30_000;
export const stepOf = (at: Date) => Math.floor(at.getTime() / STEP_MS);

export function codeAt(secret: string, step: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(step));
  const mac = createHmac('sha1', fromBase32(secret)).update(msg).digest();
  const off = mac[mac.length - 1]! & 15;
  const n = (mac.readUInt32BE(off) & 0x7fffffff) % 1_000_000;
  return String(n).padStart(6, '0');
}

/** The step the code is valid for (one step of drift either way) · null when it is wrong or was already used. */
export function checkCode(secret: string, code: string, at: Date, lastStep: number | null): number | null {
  const c = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(c)) return null;
  const now = stepOf(at);
  for (const s of [now, now - 1, now + 1]) {
    if (lastStep !== null && s <= lastStep) continue;
    if (codeAt(secret, s) === c) return s;
  }
  return null;
}

export const newSecret = () => base32(randomBytes(20));

export function otpauthUrl(secret: string, account: string): string {
  return `otpauth://totp/${encodeURIComponent(`Lost Comma:${account}`)}?secret=${secret}&issuer=${encodeURIComponent('Lost Comma')}&algorithm=SHA1&digits=6&period=30`;
}

/** "ABCD EFGH …" · easier to type into an app by hand. */
export const grouped = (secret: string) => secret.replace(/(.{4})/g, '$1 ').trim();
