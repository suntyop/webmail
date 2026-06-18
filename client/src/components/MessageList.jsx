import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Paperclip,
  Star,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Inbox as InboxIcon,
  Archive,
  Trash2,
  MailOpen,
  Mail as MailIcon,
  Clock,
} from 'lucide-react';
import { api } from '../api.js';
import { formatDate, displayName, initials, avatarColor, FOLDER_LABELS } from '../utils.js';
import SchedulePopover from './SchedulePopover.jsx';

const LIMIT = 50;

export default function MessageList({
  folder,
  folderKind,
  query,
  selectedUid,
  onOpen,
  reloadToken,
  onChanged,
}) {
  const [messages, setMessages] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snoozeTarget, setSnoozeTarget] = useState(null);
  const reqId = useRef(0);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError('');
    try {
      const data = await api.messages({ folder, page, limit: LIMIT, search: query });
      if (id !== reqId.current) return;
      setMessages(data.messages);
      setTotal(data.total);

      // Charge les aperçus en arrière-plan.
      const items = data.messages
        .filter((m) => m.textPart)
        .map((m) => ({ uid: m.uid, part: m.textPart }));
      if (items.length) {
        api
          .previews(folder, items)
          .then(({ previews }) => {
            if (id !== reqId.current) return;
            setMessages((prev) =>
              prev.map((m) => ({ ...m, snippet: previews[m.uid] ?? m.snippet }))
            );
          })
          .catch(() => {});
      }
    } catch (err) {
      if (id === reqId.current) setError(err.message);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [folder, page, query, reloadToken]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [folder, query]);

  // --- Actions sur une ligne ---
  function removeRow(uid) {
    setMessages((prev) => prev.filter((m) => m.uid !== uid));
    setTotal((t) => Math.max(0, t - 1));
    onChanged?.();
  }

  async function toggleStar(e, m) {
    e.stopPropagation();
    const next = !m.flagged;
    setMessages((prev) =>
      prev.map((x) => (x.uid === m.uid ? { ...x, flagged: next } : x))
    );
    api.setFlags(folder, m.uid, { flagged: next }).catch(() => {});
  }

  async function toggleRead(e, m) {
    e.stopPropagation();
    const next = !m.seen;
    setMessages((prev) =>
      prev.map((x) => (x.uid === m.uid ? { ...x, seen: next } : x))
    );
    api.setFlags(folder, m.uid, { seen: next }).then(onChanged).catch(() => {});
  }

  async function archive(e, m) {
    e.stopPropagation();
    removeRow(m.uid);
    api.archive(folder, m.uid).catch(() => load());
  }

  async function remove(e, m) {
    e.stopPropagation();
    removeRow(m.uid);
    api.remove(folder, m.uid).catch(() => load());
  }

  function openSnooze(e, m) {
    e.stopPropagation();
    setSnoozeTarget(m);
  }

  function doSnooze(date) {
    const m = snoozeTarget;
    setSnoozeTarget(null);
    if (!m) return;
    removeRow(m.uid);
    api.snooze(folder, m.uid, date.toISOString(), m.subject).catch(() => load());
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const isSent = folderKind === 'sent' || folderKind === 'drafts';

  return (
    <div className="flex flex-col h-full">
      {/* En-tête liste */}
      <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 h-12 border-b border-slate-200/40 dark:border-slate-700/30">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          {query ? `Recherche : « ${query} »` : FOLDER_LABELS[folderKind] || folder}
        </h2>
        {total > 0 && (
          <span className="text-xs text-slate-400">
            {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} sur {total}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-slate-300">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-sm text-rose-500">{error}</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-72 text-slate-300 dark:text-slate-600">
            <InboxIcon className="h-12 w-12 mb-3" strokeWidth={1.5} />
            <p className="text-sm">Aucun message ici</p>
          </div>
        ) : (
          <ul>
            {messages.map((m) => {
              const person = isSent ? m.to?.[0] : m.from?.[0];
              const active = m.uid === selectedUid;
              return (
                <li
                  key={m.uid}
                  onClick={() => onOpen(m)}
                  className={`group relative flex items-center gap-3 px-3 sm:px-5 h-[64px] sm:h-[56px] cursor-pointer border-b border-slate-200/40 dark:border-slate-700/25 transition-colors ${
                    active
                      ? 'bg-indigo-500/10'
                      : m.seen
                        ? 'hover:bg-slate-500/[0.06]'
                        : 'bg-indigo-500/[0.04] hover:bg-slate-500/[0.07]'
                  }`}
                >
                  {/* Accent non-lu */}
                  {!m.seen && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1 rounded-r-full bg-gradient-to-b from-indigo-500 to-violet-500" />
                  )}

                  {/* Étoile */}
                  <button
                    onClick={(e) => toggleStar(e, m)}
                    className="shrink-0 p-1 text-slate-300 hover:text-amber-400 transition"
                    title="Favori"
                  >
                    <Star
                      className={`h-[18px] w-[18px] ${
                        m.flagged ? 'text-amber-400 fill-amber-400' : ''
                      }`}
                    />
                  </button>

                  {/* Avatar */}
                  <div
                    className={`h-9 w-9 shrink-0 rounded-full ${avatarColor(
                      person?.address
                    )} text-white text-xs font-semibold flex items-center justify-center ring-2 ring-white/70 dark:ring-white/10 shadow-sm`}
                  >
                    {initials(person)}
                  </div>

                  {/* Expéditeur */}
                  <span
                    className={`w-32 sm:w-44 shrink-0 truncate text-sm ${
                      m.seen
                        ? 'text-slate-600 dark:text-slate-300'
                        : 'font-bold text-slate-900 dark:text-white'
                    }`}
                  >
                    {displayName(person) || '(inconnu)'}
                  </span>

                  {/* Objet + aperçu */}
                  <div className="flex-1 min-w-0 flex items-baseline gap-2">
                    <span
                      className={`shrink-0 max-w-[40%] truncate text-sm ${
                        m.seen
                          ? 'text-slate-700 dark:text-slate-200'
                          : 'font-bold text-slate-900 dark:text-white'
                      }`}
                    >
                      {m.subject}
                    </span>
                    <span className="flex-1 truncate text-sm text-slate-400 dark:text-slate-500 hidden sm:block">
                      {m.snippet ? `— ${m.snippet}` : ''}
                    </span>
                  </div>

                  {/* Pièce jointe */}
                  {m.hasAttachments && (
                    <Paperclip className="h-4 w-4 shrink-0 text-slate-400 group-hover:hidden" />
                  )}

                  {/* Date (cachée au survol sur desktop) */}
                  <span
                    className={`shrink-0 text-xs w-16 text-right group-hover:sm:hidden ${
                      m.seen ? 'text-slate-400' : 'font-semibold text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {formatDate(m.date, { short: true })}
                  </span>

                  {/* Actions rapides au survol (desktop) */}
                  <div className="absolute right-3 hidden group-hover:sm:flex items-center gap-0.5 glass-soft rounded-full px-1 shadow-md ring-1 ring-black/5">
                    {folderKind !== 'archive' && (
                      <IconBtn icon={Archive} title="Archiver" onClick={(e) => archive(e, m)} />
                    )}
                    <IconBtn icon={Trash2} title="Supprimer" onClick={(e) => remove(e, m)} danger />
                    <IconBtn
                      icon={Clock}
                      title="Reporter à plus tard"
                      onClick={(e) => openSnooze(e, m)}
                    />
                    <IconBtn
                      icon={m.seen ? MailIcon : MailOpen}
                      title={m.seen ? 'Marquer comme non lu' : 'Marquer comme lu'}
                      onClick={(e) => toggleRead(e, m)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {total > LIMIT && (
        <div className="shrink-0 flex items-center justify-end gap-1 px-4 py-2 border-t border-slate-100 dark:border-slate-800">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition"
          >
            <ChevronLeft className="h-5 w-5 text-slate-500" />
          </button>
          <span className="text-xs text-slate-400 px-1">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition"
          >
            <ChevronRight className="h-5 w-5 text-slate-500" />
          </button>
        </div>
      )}

      {snoozeTarget && (
        <SchedulePopover
          modal
          title="Reporter à"
          onPick={doSnooze}
          onClose={() => setSnoozeTarget(null)}
        />
      )}
    </div>
  );
}

function IconBtn({ icon: Icon, title, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded-full transition ${
        danger
          ? 'text-slate-500 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/40'
          : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
      }`}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}
