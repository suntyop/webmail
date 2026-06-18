import crypto from 'node:crypto';
import { config } from './config.js';

/**
 * Chiffrement symétrique (AES-256-GCM) pour stocker des données sensibles
 * (identifiants des envois/snoozes programmés) au repos.
 * La clé est dérivée du SESSION_SECRET : si celui-ci change, les éléments
 * programmés existants ne pourront plus être déchiffrés (ils seront ignorés).
 */
const key = crypto.scryptSync(config.sessionSecret, 'webmail-scheduler', 32);

export function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decrypt(b64) {
  const buf = Buffer.from(b64, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
