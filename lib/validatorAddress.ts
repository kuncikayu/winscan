import { createHash } from 'crypto';
export function pubkeyToAddress(consensusPubkey: any): string {
  try {
    if (!consensusPubkey || !consensusPubkey.key) {
      return '';
    }
    const pubkeyBase64 = consensusPubkey.key;
    const pubkeyBuffer = Buffer.from(pubkeyBase64, 'base64');
    const hash = createHash('sha256').update(pubkeyBuffer).digest();
    const address = hash.slice(0, 20).toString('hex').toUpperCase();
    return address;
  } catch (error) {
    console.error('Error converting pubkey to address:', error);
    return '';
  }
}
export function isValidAddress(address: string): boolean {
  return /^[0-9A-F]{40}$/i.test(address);
}
