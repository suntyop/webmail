export function formatDate(date, { short = false } = {}) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const sameYear = d.getFullYear() === now.getFullYear();

  if (short) {
    if (sameDay) {
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    if (sameYear) {
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' });
  }

  return d.toLocaleString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function displayName(addr) {
  if (!addr) return '';
  if (Array.isArray(addr)) return addr.map(displayName).join(', ');
  return addr.name || addr.address || '';
}

export function initials(addr) {
  const name = (addr?.name || addr?.address || '?').trim();
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Couleur d'avatar déterministe à partir d'une chaîne.
const COLORS = [
  'bg-rose-500',
  'bg-pink-500',
  'bg-fuchsia-500',
  'bg-violet-500',
  'bg-indigo-500',
  'bg-blue-500',
  'bg-sky-500',
  'bg-teal-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-orange-500',
];
export function avatarColor(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function formatSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export const FOLDER_LABELS = {
  inbox: 'Boîte de réception',
  sent: 'Envoyés',
  drafts: 'Brouillons',
  trash: 'Corbeille',
  junk: 'Indésirables',
  archive: 'Archives',
};
