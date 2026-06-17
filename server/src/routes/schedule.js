import { Router } from 'express';
import multer from 'multer';
import { getClient } from '../imap.js';
import { asyncHandler } from '../middleware.js';
import { encrypt } from '../crypto.js';
import { addItem, listItems, removeItem } from '../store.js';
import { snoozeMessage } from '../mailer.js';
import { parseMessage } from '../mailHelpers.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 20 },
});

/* ------------------------------------------------------------------ */
/* Programmer un envoi différé                                        */
/* ------------------------------------------------------------------ */
router.post(
  '/schedule/send',
  upload.array('attachments'),
  asyncHandler(async (req, res) => {
    const credentials = req.session.credentials;
    const {
      to,
      cc,
      bcc,
      subject,
      text,
      html,
      inReplyTo,
      references,
      forwardUid,
      forwardFolder,
      sendAt,
    } = req.body;

    if (!to) return res.status(400).json({ error: 'Destinataire requis' });
    const dueAt = new Date(sendAt).getTime();
    if (!dueAt || Number.isNaN(dueAt)) {
      return res.status(400).json({ error: "Date d'envoi invalide" });
    }

    const attachments = (req.files || []).map((f) => ({
      filename: f.originalname,
      contentType: f.mimetype,
      contentB64: f.buffer.toString('base64'),
    }));

    // Transfert : on résout les pièces jointes d'origine dès maintenant.
    if (forwardUid) {
      const client = await getClient(req.session);
      const lock = await client.getMailboxLock(forwardFolder || 'INBOX');
      try {
        const orig = await client.fetchOne(String(forwardUid), { source: true }, {
          uid: true,
        });
        if (orig?.source) {
          const parsed = await parseMessage(orig.source);
          for (const att of parsed.rawAttachments) {
            if (att.related) continue;
            attachments.push({
              filename: att.filename || 'piece-jointe',
              contentType: att.contentType,
              contentB64: att.content.toString('base64'),
            });
          }
        }
      } finally {
        lock.release();
      }
    }

    const item = addItem({
      type: 'send',
      owner: credentials.email,
      dueAt,
      cred: encrypt(JSON.stringify(credentials)),
      payload: {
        message: { to, cc, bcc, subject, text, html, inReplyTo, references },
        attachments,
      },
    });

    res.json({ id: item.id, dueAt });
  })
);

/* ------------------------------------------------------------------ */
/* Reporter (snooze) un message                                       */
/* ------------------------------------------------------------------ */
router.post(
  '/schedule/snooze',
  asyncHandler(async (req, res) => {
    const credentials = req.session.credentials;
    const { folder = 'INBOX', uid, returnAt } = req.body || {};
    if (!uid) return res.status(400).json({ error: 'Message requis' });
    const dueAt = new Date(returnAt).getTime();
    if (!dueAt || Number.isNaN(dueAt)) {
      return res.status(400).json({ error: 'Date de retour invalide' });
    }

    // Déplace immédiatement le message vers le dossier Snoozed.
    const moved = await snoozeMessage(credentials, folder, uid);

    const item = addItem({
      type: 'snooze',
      owner: credentials.email,
      dueAt,
      cred: encrypt(JSON.stringify(credentials)),
      payload: { folder: moved.folder, uid: moved.uid, subject: req.body.subject || '' },
    });

    res.json({ id: item.id, dueAt });
  })
);

/* ------------------------------------------------------------------ */
/* Lister / annuler les éléments programmés                           */
/* ------------------------------------------------------------------ */
router.get(
  '/schedule',
  asyncHandler(async (req, res) => {
    const items = listItems(req.session.credentials.email).map((i) => ({
      id: i.id,
      type: i.type,
      dueAt: i.dueAt,
      to: i.payload?.message?.to || null,
      subject: i.payload?.message?.subject || i.payload?.subject || '',
    }));
    res.json({ items });
  })
);

router.delete(
  '/schedule/:id',
  asyncHandler(async (req, res) => {
    const items = listItems(req.session.credentials.email);
    const owned = items.find((i) => i.id === req.params.id);
    if (!owned) return res.status(404).json({ error: 'Élément introuvable' });
    removeItem(req.params.id);
    res.json({ ok: true });
  })
);

export default router;
