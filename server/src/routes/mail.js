import { Router } from 'express';
import multer from 'multer';
import nodemailer from 'nodemailer';
import MailComposer from 'nodemailer/lib/mail-composer/index.js';
import { config } from '../config.js';
import { getClient } from '../imap.js';
import { asyncHandler } from '../middleware.js';
import {
  categorize,
  findSpecialFolder,
  findTextPart,
  makeSnippet,
  mapAddresses,
  parseMessage,
  structureHasAttachments,
} from '../mailHelpers.js';

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (c) => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 20 }, // 25 Mo / fichier
});

/* ------------------------------------------------------------------ */
/* Dossiers                                                            */
/* ------------------------------------------------------------------ */
router.get(
  '/folders',
  asyncHandler(async (req, res) => {
    const client = await getClient(req.session);
    const list = await client.list({ statusQuery: { messages: true, unseen: true } });
    const folders = list
      .filter((m) => !m.flags?.has('\\Noselect'))
      .map((m) => ({
        path: m.path,
        name: m.name,
        kind: categorize(m),
        total: m.status?.messages ?? null,
        unseen: m.status?.unseen ?? null,
      }));
    res.json({ folders });
  })
);

/* ------------------------------------------------------------------ */
/* Liste des messages (pagination + recherche)                        */
/* ------------------------------------------------------------------ */
router.get(
  '/messages',
  asyncHandler(async (req, res) => {
    const folder = req.query.folder || 'INBOX';
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const search = (req.query.search || '').trim();

    const client = await getClient(req.session);
    const lock = await client.getMailboxLock(folder);
    try {
      const mailbox = client.mailbox;
      const total = mailbox.exists;
      let messages = [];
      let totalCount = total;

      const fetchOptions = {
        envelope: true,
        flags: true,
        bodyStructure: true,
        internalDate: true,
      };

      if (search) {
        const uids = await client.search(
          {
            or: [
              { subject: search },
              { from: search },
              { to: search },
              { body: search },
            ],
          },
          { uid: true }
        );
        totalCount = uids.length;
        const ordered = uids.slice().reverse(); // plus récents d'abord
        const slice = ordered.slice((page - 1) * limit, page * limit);
        if (slice.length) {
          for await (const msg of client.fetch(slice.join(','), fetchOptions, {
            uid: true,
          })) {
            messages.push(summarize(msg));
          }
          // conserve l'ordre du slice
          const order = new Map(slice.map((u, i) => [u, i]));
          messages.sort((a, b) => order.get(a.uid) - order.get(b.uid));
        }
      } else if (total > 0) {
        const end = total - (page - 1) * limit;
        const start = Math.max(1, end - limit + 1);
        if (end >= 1) {
          for await (const msg of client.fetch(`${start}:${end}`, fetchOptions)) {
            messages.push(summarize(msg));
          }
          messages.reverse(); // plus récents d'abord
        }
      }

      res.json({ folder, page, limit, total: totalCount, messages });
    } finally {
      lock.release();
    }
  })
);

function summarize(msg) {
  const env = msg.envelope || {};
  return {
    uid: msg.uid,
    subject: env.subject || '(sans objet)',
    from: mapAddresses(env.from),
    to: mapAddresses(env.to),
    date: env.date || msg.internalDate,
    seen: msg.flags?.has('\\Seen') ?? false,
    flagged: msg.flags?.has('\\Flagged') ?? false,
    answered: msg.flags?.has('\\Answered') ?? false,
    hasAttachments: structureHasAttachments(msg.bodyStructure),
    textPart: findTextPart(msg.bodyStructure),
  };
}

/* ------------------------------------------------------------------ */
/* Aperçus (snippets) d'une page de messages                          */
/* ------------------------------------------------------------------ */
router.post(
  '/messages/preview',
  asyncHandler(async (req, res) => {
    const { folder = 'INBOX', items = [] } = req.body || {};
    const client = await getClient(req.session);
    const previews = {};
    const lock = await client.getMailboxLock(folder);
    try {
      for (const item of items) {
        if (!item?.part) {
          previews[item.uid] = '';
          continue;
        }
        try {
          const { content } = await client.download(String(item.uid), item.part, {
            uid: true,
          });
          const buf = await streamToBuffer(content);
          previews[item.uid] = makeSnippet(buf.toString('utf8'));
        } catch {
          previews[item.uid] = '';
        }
      }
    } finally {
      lock.release();
    }
    res.json({ previews });
  })
);

/* ------------------------------------------------------------------ */
/* Lecture d'un message                                               */
/* ------------------------------------------------------------------ */
router.get(
  '/messages/:uid',
  asyncHandler(async (req, res) => {
    const folder = req.query.folder || 'INBOX';
    const uid = String(req.params.uid);
    const client = await getClient(req.session);
    const lock = await client.getMailboxLock(folder);
    try {
      const msg = await client.fetchOne(uid, { source: true }, { uid: true });
      if (!msg || !msg.source) {
        return res.status(404).json({ error: 'Message introuvable' });
      }
      const parsed = await parseMessage(msg.source);
      // Marque comme lu.
      await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true }).catch(() => {});

      res.json({
        uid: Number(uid),
        folder,
        subject: parsed.subject,
        from: parsed.from,
        to: parsed.to,
        cc: parsed.cc,
        date: parsed.date,
        messageId: parsed.messageId,
        html: parsed.html,
        text: parsed.text,
        attachments: parsed.attachments,
      });
    } finally {
      lock.release();
    }
  })
);

/* ------------------------------------------------------------------ */
/* Téléchargement d'une pièce jointe                                  */
/* ------------------------------------------------------------------ */
router.get(
  '/messages/:uid/attachments/:index',
  asyncHandler(async (req, res) => {
    const folder = req.query.folder || 'INBOX';
    const uid = String(req.params.uid);
    const index = Number(req.params.index);
    const client = await getClient(req.session);
    const lock = await client.getMailboxLock(folder);
    try {
      const msg = await client.fetchOne(uid, { source: true }, { uid: true });
      if (!msg || !msg.source) {
        return res.status(404).json({ error: 'Message introuvable' });
      }
      const parsed = await parseMessage(msg.source);
      const att = parsed.rawAttachments[index];
      if (!att) return res.status(404).json({ error: 'Pièce jointe introuvable' });

      const filename = att.filename || `piece-jointe-${index + 1}`;
      res.setHeader('Content-Type', att.contentType || 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `${req.query.inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(
          filename
        )}"`
      );
      res.send(att.content);
    } finally {
      lock.release();
    }
  })
);

/* ------------------------------------------------------------------ */
/* Modifier les drapeaux (lu / non lu / favori)                       */
/* ------------------------------------------------------------------ */
router.post(
  '/messages/:uid/flags',
  asyncHandler(async (req, res) => {
    const folder = req.query.folder || 'INBOX';
    const uid = String(req.params.uid);
    const { seen, flagged } = req.body || {};
    const client = await getClient(req.session);
    const lock = await client.getMailboxLock(folder);
    try {
      if (typeof seen === 'boolean') {
        await client[seen ? 'messageFlagsAdd' : 'messageFlagsRemove'](
          uid,
          ['\\Seen'],
          { uid: true }
        );
      }
      if (typeof flagged === 'boolean') {
        await client[flagged ? 'messageFlagsAdd' : 'messageFlagsRemove'](
          uid,
          ['\\Flagged'],
          { uid: true }
        );
      }
      res.json({ ok: true });
    } finally {
      lock.release();
    }
  })
);

/* ------------------------------------------------------------------ */
/* Suppression (corbeille puis suppression définitive)                */
/* ------------------------------------------------------------------ */
router.delete(
  '/messages/:uid',
  asyncHandler(async (req, res) => {
    const folder = req.query.folder || 'INBOX';
    const uid = String(req.params.uid);
    const client = await getClient(req.session);
    const trash = await findSpecialFolder(client, 'trash');

    const lock = await client.getMailboxLock(folder);
    try {
      if (!trash || folder === trash) {
        await client.messageDelete(uid, { uid: true });
        res.json({ ok: true, action: 'deleted' });
      } else {
        await client.messageMove(uid, trash, { uid: true });
        res.json({ ok: true, action: 'moved-to-trash' });
      }
    } finally {
      lock.release();
    }
  })
);

/* ------------------------------------------------------------------ */
/* Archivage (déplacement vers le dossier Archives)                   */
/* ------------------------------------------------------------------ */
router.post(
  '/messages/:uid/archive',
  asyncHandler(async (req, res) => {
    const folder = req.query.folder || 'INBOX';
    const uid = String(req.params.uid);
    const client = await getClient(req.session);
    const archive = await findSpecialFolder(client, 'archive');
    if (!archive) {
      return res.status(400).json({ error: "Aucun dossier d'archives disponible" });
    }
    const lock = await client.getMailboxLock(folder);
    try {
      if (folder !== archive) {
        await client.messageMove(uid, archive, { uid: true });
      }
      res.json({ ok: true });
    } finally {
      lock.release();
    }
  })
);

/* ------------------------------------------------------------------ */
/* Envoi (nouveau / réponse / transfert) + pièces jointes             */
/* ------------------------------------------------------------------ */
router.post(
  '/send',
  upload.array('attachments'),
  asyncHandler(async (req, res) => {
    const { email, password } = req.session.credentials;
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
    } = req.body;

    if (!to) return res.status(400).json({ error: 'Destinataire requis' });

    const attachments = (req.files || []).map((f) => ({
      filename: f.originalname,
      content: f.buffer,
      contentType: f.mimetype,
    }));

    // Transfert : on rattache les pièces jointes du message d'origine.
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
            if (att.related) continue; // ignore les images inline déjà dans le HTML
            attachments.push({
              filename: att.filename || 'piece-jointe',
              content: att.content,
              contentType: att.contentType,
            });
          }
        }
      } finally {
        lock.release();
      }
    }

    const mailOptions = {
      from: email,
      to,
      cc: cc || undefined,
      bcc: bcc || undefined,
      subject: subject || '(sans objet)',
      text: text || undefined,
      html: html || undefined,
      inReplyTo: inReplyTo || undefined,
      references: references || undefined,
      attachments,
    };

    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: { user: email, pass: password },
      // Délais courts : en cas de port SMTP bloqué/injoignable, on échoue
      // rapidement avec une erreur claire plutôt que de rester bloqué.
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });

    // Compile une fois le MIME brut pour l'envoyer ET l'archiver dans "Envoyés".
    const raw = await new MailComposer(mailOptions).compile().build();

    await transporter.sendMail({
      envelope: {
        from: email,
        to: [to, cc, bcc].filter(Boolean).join(','),
      },
      raw,
    });

    // Archive une copie dans le dossier Envoyés (best-effort).
    try {
      const client = await getClient(req.session);
      const sent = await findSpecialFolder(client, 'sent');
      if (sent) await client.append(sent, raw, ['\\Seen']);
    } catch {
      /* l'envoi a réussi, l'archivage n'est pas bloquant */
    }

    // Marque le message d'origine comme répondu.
    if (inReplyTo && req.body.replyUid && req.body.replyFolder) {
      try {
        const client = await getClient(req.session);
        const lock = await client.getMailboxLock(req.body.replyFolder);
        try {
          await client.messageFlagsAdd(String(req.body.replyUid), ['\\Answered'], {
            uid: true,
          });
        } finally {
          lock.release();
        }
      } catch {
        /* non bloquant */
      }
    }

    res.json({ ok: true });
  })
);

export default router;
