import crypto from 'node:crypto';
import { config } from './config.js';

/**
 * Stockage des sessions en mémoire.
 * On garde les identifiants IMAP/SMTP côté serveur (jamais envoyés au client),
 * indexés par un token aléatoire transmis via un cookie httpOnly.
 *
 * Note: en mémoire => les sessions sont perdues au redémarrage du serveur,
 * ce qui est acceptable pour un webmail mono/petit usage.
 */
const sessions = new Map();

export function createSession(credentials) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    credentials, // { email, password }
    createdAt: Date.now(),
    lastAccess: Date.now(),
    imapClient: null, // connexion IMAP réutilisable, posée par imap.js
  });
  return token;
}

export function getSession(token) {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() - session.lastAccess > config.sessionTtlMs) {
    destroySession(token);
    return null;
  }
  session.lastAccess = Date.now();
  return session;
}

export function destroySession(token) {
  const session = sessions.get(token);
  if (session?.imapClient) {
    try {
      session.imapClient.logout().catch(() => {});
    } catch {
      /* ignore */
    }
  }
  sessions.delete(token);
}

// Nettoyage périodique des sessions expirées.
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (now - session.lastAccess > config.sessionTtlMs) {
      destroySession(token);
    }
  }
}, 60 * 1000).unref();
