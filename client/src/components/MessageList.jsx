import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  Paperclip,
  Star,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Inbox as InboxIcon,
} from 'lucide-react';
import { api } from '../api.js';
import { formatDate, displayName, initials, avatarColor, FOLDER_LABELS } from '../utils.js';

const LIMIT = 50;

export default function MessageList({
  folder,
  folderKind,
  selectedUid,
  onOpen,
  reloadToken,
}) {
  const [messages, setMessages] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.messages({ folder, page, limit: LIMIT, search: query });
      setMessages(data.messages);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [folder, page, query, reloadToken]);

  useEffect(() => {
    load();
  }, [load]);

  // Réinitialise la page quand on change de dossier ou de recherche.
  useEffect(() => {
    setPage(1);
  }, [folder, query]);

  function submitSearch(e) {
    e.preventDefault();
    setQuery(search.trim());
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const isSent = folderKind === 'sent' || folderKind === 'drafts';

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* En-tête */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {FOLDER_LABELS[folderKind] || folder}
          </h2>
          <button
            onClick={load}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Actualiser"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <form onSubmit={submitSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition"
          />
        </form>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-sm text-rose-500">{error}</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-slate-400 dark:text-slate-500">
            <InboxIcon className="h-10 w-10 mb-2" />
            <p className="text-sm">Aucun message</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {messages.map((m) => {
              const person = isSent ? m.to?.[0] : m.from?.[0];
              const active = m.uid === selectedUid;
              return (
                <li key={m.uid}>
                  <button
                    onClick={() => onOpen(m)}
                    className={`w-full text-left px-4 py-3 flex gap-3 transition ${
                      active
                        ? 'bg-indigo-50 dark:bg-indigo-500/10'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div
                      className={`h-9 w-9 shrink-0 rounded-full ${avatarColor(
                        person?.address
                      )} text-white text-xs font-semibold flex items-center justify-center`}
                    >
                      {initials(person)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex-1 truncate text-sm ${
                            m.seen
                              ? 'text-slate-600 dark:text-slate-300'
                              : 'font-semibold text-slate-900 dark:text-white'
                          }`}
                        >
                          {displayName(person) || '(inconnu)'}
                        </span>
                        <span className="shrink-0 text-xs text-slate-400">
                          {formatDate(m.date, { short: true })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {!m.seen && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                        )}
                        <span
                          className={`flex-1 truncate text-sm ${
                            m.seen
                              ? 'text-slate-500 dark:text-slate-400'
                              : 'font-medium text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {m.subject}
                        </span>
                        {m.flagged && (
                          <Star className="h-3.5 w-3.5 shrink-0 text-amber-400 fill-amber-400" />
                        )}
                        {m.hasAttachments && (
                          <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {total > LIMIT && (
        <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t border-slate-100 dark:border-slate-800 text-sm text-slate-500">
          <span>
            {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} sur {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
