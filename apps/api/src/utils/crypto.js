import crypto from 'crypto';

export function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function randomToken() {
  return crypto.randomBytes(48).toString('base64url');
}
