const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

export function generateInviteCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z2-9]/g, '');
}

export function isValidInviteCode(code: string): boolean {
  if (code.length !== CODE_LENGTH) return false;
  for (const ch of code) {
    if (!ALPHABET.includes(ch)) return false;
  }
  return true;
}

export const INVITE_CODE_LENGTH = CODE_LENGTH;
