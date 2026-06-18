import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../data');
const FILE = path.join(DATA_DIR, 'scheduled.json');

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function load() {
  try {
    ensure();
    if (!fs.existsSync(FILE)) return { items: [] };
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return { items: [] };
  }
}

function save(data) {
  ensure();
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

/**
 * Ajoute un élément programmé (envoi différé ou snooze).
 * `entry` : { type, owner, dueAt, cred (chiffré), payload }
 */
export function addItem(entry) {
  const data = load();
  const item = { id: crypto.randomUUID(), attempts: 0, createdAt: Date.now(), ...entry };
  data.items.push(item);
  save(data);
  return item;
}

export function removeItem(id) {
  const data = load();
  data.items = data.items.filter((i) => i.id !== id);
  save(data);
}

export function updateItem(id, patch) {
  const data = load();
  const item = data.items.find((i) => i.id === id);
  if (item) {
    Object.assign(item, patch);
    save(data);
  }
}

export function listItems(owner, type) {
  return load().items.filter(
    (i) => (!owner || i.owner === owner) && (!type || i.type === type)
  );
}

export function dueItems(now = Date.now()) {
  return load().items.filter((i) => i.dueAt <= now);
}
