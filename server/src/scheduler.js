import { dueItems, removeItem, updateItem } from './store.js';
import { decrypt } from './crypto.js';
import { deliver, unsnoozeMessage } from './mailer.js';

const MAX_ATTEMPTS = 5;
let running = false;

async function processItem(item) {
  let credentials;
  try {
    credentials = JSON.parse(decrypt(item.cred));
  } catch {
    // SESSION_SECRET a changé ou données corrompues : on abandonne l'élément.
    removeItem(item.id);
    return;
  }

  if (item.type === 'send') {
    const attachments = (item.payload.attachments || []).map((a) => ({
      filename: a.filename,
      contentType: a.contentType,
      content: Buffer.from(a.contentB64, 'base64'),
    }));
    await deliver(credentials, item.payload.message, attachments);
  } else if (item.type === 'snooze') {
    await unsnoozeMessage(credentials, item.payload);
  }
}

async function tick() {
  if (running) return;
  running = true;
  try {
    for (const item of dueItems()) {
      try {
        await processItem(item);
        removeItem(item.id);
        console.log(`[scheduler] ${item.type} ${item.id} traité`);
      } catch (err) {
        const attempts = (item.attempts || 0) + 1;
        if (attempts >= MAX_ATTEMPTS) {
          console.error(`[scheduler] ${item.type} ${item.id} abandonné :`, err.message);
          removeItem(item.id);
        } else {
          updateItem(item.id, { attempts, lastError: err.message });
        }
      }
    }
  } finally {
    running = false;
  }
}

export function startScheduler() {
  setInterval(tick, 30 * 1000).unref();
  tick();
}
