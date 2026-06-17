import { ImapFlow } from 'imapflow';
import { config } from './config.js';

/**
 * Crée et connecte un client ImapFlow avec les identifiants donnés.
 */
async function connect(credentials) {
  const client = new ImapFlow({
    host: config.imap.host,
    port: config.imap.port,
    secure: config.imap.secure,
    auth: {
      user: credentials.email,
      pass: credentials.password,
    },
    logger: false,
    emitLogs: false,
  });
  await client.connect();
  return client;
}

/**
 * Vérifie des identifiants en ouvrant une connexion IMAP puis en se déconnectant.
 * Lève une erreur si l'authentification échoue.
 */
export async function verifyCredentials(credentials) {
  const client = await connect(credentials);
  await client.logout();
}

/**
 * Renvoie un client IMAP connecté et réutilisable pour une session donnée.
 * Reconnecte automatiquement si la connexion a été coupée.
 */
export async function getClient(session) {
  if (session.imapClient && session.imapClient.usable) {
    return session.imapClient;
  }
  const client = await connect(session.credentials);
  client.on('error', () => {
    // En cas d'erreur, on invalide le client : il sera recréé au prochain appel.
    if (session.imapClient === client) session.imapClient = null;
  });
  session.imapClient = client;
  return client;
}
