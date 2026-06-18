import nodemailer from 'nodemailer';
import MailComposer from 'nodemailer/lib/mail-composer/index.js';
import { ImapFlow } from 'imapflow';
import { config } from './config.js';
import { findSpecialFolder } from './mailHelpers.js';

const SNOOZE_FOLDER = 'Snoozed';

function imapClient(credentials) {
  return new ImapFlow({
    host: config.imap.host,
    port: config.imap.port,
    secure: config.imap.secure,
    auth: { user: credentials.email, pass: credentials.password },
    logger: false,
    emitLogs: false,
  });
}

/**
 * Construit le MIME brut d'un message.
 */
export async function buildRaw(credentials, message, attachments = []) {
  const mailOptions = {
    from: credentials.email,
    to: message.to,
    cc: message.cc || undefined,
    bcc: message.bcc || undefined,
    subject: message.subject || '(sans objet)',
    text: message.text || undefined,
    html: message.html || undefined,
    inReplyTo: message.inReplyTo || undefined,
    references: message.references || undefined,
    attachments: attachments.map((a) => ({
      filename: a.filename,
      content: a.content, // Buffer
      contentType: a.contentType,
    })),
  };
  return new MailComposer(mailOptions).compile().build();
}

/**
 * Envoie un message (SMTP) puis l'archive dans le dossier Envoyés.
 */
export async function deliver(credentials, message, attachments = []) {
  const raw = await buildRaw(credentials, message, attachments);

  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: { user: credentials.email, pass: credentials.password },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });

  await transporter.sendMail({
    envelope: {
      from: credentials.email,
      to: [message.to, message.cc, message.bcc].filter(Boolean).join(','),
    },
    raw,
  });

  // Archive une copie dans "Envoyés" (best-effort).
  try {
    const client = imapClient(credentials);
    await client.connect();
    const sent = await findSpecialFolder(client, 'sent');
    if (sent) await client.append(sent, raw, ['\\Seen']);
    await client.logout();
  } catch {
    /* l'envoi a réussi, l'archivage n'est pas bloquant */
  }
}

/**
 * Déplace un message vers le dossier "Snoozed" (créé si besoin) et renvoie
 * son nouvel UID dans ce dossier.
 */
export async function snoozeMessage(credentials, folder, uid) {
  const client = imapClient(credentials);
  await client.connect();
  try {
    const exists = (await client.list()).some((m) => m.path === SNOOZE_FOLDER);
    if (!exists) await client.mailboxCreate(SNOOZE_FOLDER);

    const lock = await client.getMailboxLock(folder);
    let newUid = null;
    try {
      const res = await client.messageMove(String(uid), SNOOZE_FOLDER, { uid: true });
      // uidMap : Map(uid source -> uid destination) si le serveur supporte UIDPLUS
      if (res?.uidMap) newUid = res.uidMap.get(Number(uid)) ?? null;
    } finally {
      lock.release();
    }
    return { folder: SNOOZE_FOLDER, uid: newUid };
  } finally {
    await client.logout().catch(() => {});
  }
}

/**
 * Ramène un message snoozé vers la boîte de réception et le marque non lu.
 */
export async function unsnoozeMessage(credentials, payload) {
  const client = imapClient(credentials);
  await client.connect();
  try {
    const lock = await client.getMailboxLock(payload.folder || SNOOZE_FOLDER);
    try {
      const uid = String(payload.uid);
      await client.messageFlagsRemove(uid, ['\\Seen'], { uid: true }).catch(() => {});
      await client.messageMove(uid, 'INBOX', { uid: true });
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
}

export { SNOOZE_FOLDER };
