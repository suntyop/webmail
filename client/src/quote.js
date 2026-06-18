/**
 * Sépare le contenu "nouveau" d'un message de l'historique cité (échanges
 * précédents), afin de pouvoir replier ce dernier façon Gmail.
 */

const QUOTE_SELECTORS = [
  '.gmail_quote',
  '.gmail_quote_container',
  'blockquote[type="cite"]',
  'blockquote',
  '#divRplyFwdMsg', // Outlook
  '.moz-cite-prefix', // Thunderbird
  '.protonmail_quote',
  '.yahoo_quoted',
].join(', ');

// Reconnaît une ligne d'attribution ("Le … a écrit :", "On … wrote:", etc.)
const ATTRIBUTION = /(a\s+écrit\s*:|wrote:|escribió:|schrieb:|a\s+scris:|le\s+.+\s+à\s+\d|on\s+.+\bat\b.+:)/i;

/**
 * Découpe du HTML en { main, quoted }. `quoted` vaut null si rien n'est cité.
 */
export function splitHtmlQuote(html) {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const found = doc.body.querySelector(QUOTE_SELECTORS);
    if (!found) return { main: html, quoted: null };

    // Préfère le conteneur de citation le plus englobant.
    let quote = found.closest('.gmail_quote, .gmail_quote_container') || found;

    // Inclut une éventuelle ligne d'attribution juste avant la citation.
    let start = quote;
    const prev = start.previousElementSibling;
    if (prev && ATTRIBUTION.test(prev.textContent || '')) {
      start = prev;
    }

    // Déplace la citation (et ce qui suit) dans un conteneur séparé.
    const quotedDiv = doc.createElement('div');
    let node = start;
    while (node) {
      const next = node.nextSibling;
      quotedDiv.appendChild(node);
      node = next;
    }

    const main = doc.body.innerHTML.trim();
    const quoted = quotedDiv.innerHTML.trim();
    // Si on masquerait tout le message, on préfère ne rien replier.
    if (!main || !quoted) return { main: html, quoted: null };
    return { main, quoted };
  } catch {
    return { main: html, quoted: null };
  }
}

/**
 * Découpe du texte brut en { main, quoted }.
 */
export function splitTextQuote(text) {
  const lines = text.split('\n');
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^\s*>/.test(l)) {
      idx = i;
      break;
    }
    if (ATTRIBUTION.test(l)) {
      idx = i;
      break;
    }
    if (/^\s*-{2,}\s*(message|forwarded|original)/i.test(l)) {
      idx = i;
      break;
    }
    if (/^_{5,}/.test(l)) {
      idx = i;
      break;
    }
  }
  if (idx <= 0) return { main: text, quoted: null };
  const main = lines.slice(0, idx).join('\n').trim();
  const quoted = lines.slice(idx).join('\n').trim();
  if (!main || !quoted) return { main: text, quoted: null };
  return { main, quoted };
}

/**
 * Découpe un message (html prioritaire, sinon texte) et indique le type.
 */
export function splitMessage(msg) {
  if (msg.html) return { type: 'html', ...splitHtmlQuote(msg.html) };
  if (msg.text) return { type: 'text', ...splitTextQuote(msg.text) };
  return { type: 'text', main: '', quoted: null };
}

/**
 * Cherche la ligne d'attribution associée à une citation HTML.
 */
function findAttribution(bq) {
  let prev = bq.previousElementSibling;
  while (prev && !(prev.textContent || '').trim()) prev = prev.previousElementSibling;
  if (prev) {
    const t = (prev.textContent || '').trim();
    const cls = prev.classList;
    if (cls?.contains('gmail_attr') || cls?.contains('moz-cite-prefix') || ATTRIBUTION.test(t)) {
      return t.replace(/\s+/g, ' ').slice(0, 200);
    }
  }
  return null;
}

/**
 * Découpe l'historique cité HTML en messages individuels { attribution, html }.
 * Chaque blockquote imbriqué = un message précédent.
 */
export function parseQuotedHtml(html) {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const blockquotes = Array.from(doc.querySelectorAll('blockquote'));
    if (blockquotes.length === 0) return [{ attribution: null, html }];

    const messages = [];
    for (const bq of blockquotes) {
      const attribution = findAttribution(bq);
      const clone = bq.cloneNode(true);
      // Retire les niveaux imbriqués pour ne garder que ce message-ci.
      clone
        .querySelectorAll(
          'blockquote, .gmail_quote, .gmail_quote_container, .gmail_attr, .moz-cite-prefix'
        )
        .forEach((n) => n.remove());
      const body = clone.innerHTML.trim();
      if (body || attribution) messages.push({ attribution, html: body });
    }
    return messages.length ? messages : [{ attribution: null, html }];
  } catch {
    return [{ attribution: null, html }];
  }
}

/**
 * Découpe l'historique cité texte en messages individuels { attribution, text }.
 */
export function parseQuotedText(text) {
  const lines = text.split('\n');
  const messages = [];
  let current = { attribution: null, lines: [] };
  const push = () => {
    if (current.attribution || current.lines.join('').trim()) messages.push(current);
  };
  for (const raw of lines) {
    const clean = raw.replace(/^[>\s]*/, ''); // enlève les chevrons de citation
    if (ATTRIBUTION.test(clean)) {
      push();
      current = { attribution: clean.trim(), lines: [] };
    } else {
      current.lines.push(clean);
    }
  }
  push();
  const result = messages
    .map((m) => ({ attribution: m.attribution, text: m.lines.join('\n').trim() }))
    .filter((m) => m.attribution || m.text);
  return result.length ? result : [{ attribution: null, text }];
}

/**
 * Extrait nom/adresse d'une ligne d'attribution pour l'avatar.
 */
export function parseAttribution(str) {
  if (!str) return { name: '', address: '', label: 'Message précédent' };
  const email = str.match(/[\w.+-]+@[\w.-]+\.\w+/);
  const address = email ? email[0] : '';
  let name = '';
  const m = str.match(/([^,<]+?)\s*(?:<|\ba\s+écrit\b|\bwrote\b)/i);
  if (m) name = m[1].replace(/^le\s+/i, '').trim();
  return { name, address, label: str.replace(/\s+/g, ' ').trim().slice(0, 160) };
}

/**
 * Parse le message en : message courant + fil des messages précédents.
 */
export function parseThread(msg) {
  const { type, main, quoted } = splitMessage(msg);
  if (!quoted) return { type, main, thread: [] };
  const thread =
    type === 'html'
      ? parseQuotedHtml(quoted).map((m) => ({ attribution: m.attribution, content: m.html }))
      : parseQuotedText(quoted).map((m) => ({ attribution: m.attribution, content: m.text }));
  return { type, main, thread };
}
