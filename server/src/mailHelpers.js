import { simpleParser } from 'mailparser';

/**
 * Catégorise une boîte aux lettres à partir de son specialUse / nom.
 */
export function categorize(mailbox) {
  const su = (mailbox.specialUse || '').toLowerCase();
  if (su.includes('inbox')) return 'inbox';
  if (su.includes('sent')) return 'sent';
  if (su.includes('drafts')) return 'drafts';
  if (su.includes('trash')) return 'trash';
  if (su.includes('junk')) return 'junk';
  if (su.includes('archive')) return 'archive';
  if (mailbox.path.toUpperCase() === 'INBOX') return 'inbox';
  return 'other';
}

/**
 * Trouve le chemin d'une boîte spéciale (sent, trash, ...).
 */
export async function findSpecialFolder(client, kind) {
  const list = await client.list();
  const match = list.find((m) => categorize(m) === kind);
  return match?.path || null;
}

/**
 * Détermine si une structure de corps contient des pièces jointes "réelles"
 * (disposition attachment, ou partie non-texte avec nom de fichier).
 */
export function structureHasAttachments(node) {
  if (!node) return false;
  const disp = (node.disposition || '').toLowerCase();
  if (disp === 'attachment') return true;
  if (node.childNodes) {
    return node.childNodes.some(structureHasAttachments);
  }
  return false;
}

/**
 * Convertit un objet adresse imapflow en { name, address }[].
 */
export function mapAddresses(addr) {
  if (!addr) return [];
  return (addr.value || addr).map((a) => ({
    name: a.name || '',
    address: a.address || '',
  }));
}

/**
 * Parse la source brute d'un message et renvoie un objet exploitable
 * (html sécurisable côté client, texte, métadonnées, pièces jointes).
 */
export async function parseMessage(source) {
  const parsed = await simpleParser(source);

  const attachments = (parsed.attachments || []).map((att, index) => ({
    index,
    filename: att.filename || `piece-jointe-${index + 1}`,
    contentType: att.contentType,
    size: att.size,
    contentId: att.contentId ? att.contentId.replace(/[<>]/g, '') : null,
    inline: att.contentDisposition === 'inline' || Boolean(att.related),
  }));

  // Remplace les images inline (cid:) par des data URIs pour un affichage direct.
  let html = parsed.html || null;
  if (html) {
    for (const att of parsed.attachments || []) {
      if (att.contentId) {
        const cid = att.contentId.replace(/[<>]/g, '');
        const dataUri = `data:${att.contentType};base64,${att.content.toString('base64')}`;
        html = html.split(`cid:${cid}`).join(dataUri);
      }
    }
  }

  return {
    subject: parsed.subject || '(sans objet)',
    from: mapAddresses(parsed.from),
    to: mapAddresses(parsed.to),
    cc: mapAddresses(parsed.cc),
    date: parsed.date,
    messageId: parsed.messageId || null,
    html,
    text: parsed.text || null,
    attachments: attachments.filter((a) => !a.inline || !html), // les inline déjà intégrées
    rawAttachments: parsed.attachments || [],
  };
}
