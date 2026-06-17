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
